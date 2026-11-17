import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
    setupTestDb,
    teardownTestDb,
    resetTestDb,
    addSeriesProgress,
    addSeriesCheckin,
    getSeriesProgressList,
    deleteSeriesProgress,
    abandonSeriesProgress,
    addMovieReview,
    getTestPrisma,
    USER_1,
    USER_2
} from "../harness";
import { SAMPLE_SERIES } from "../fixtures/sample-series";

describe("Tier 1 - R2: Modelo Híbrido de Registro de Séries (Tempo Real e Retroativo)", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("T1-R2-01: Support multiple active series in progress concurrently in Assistindo no momento", async () => {
        const seriesA = await addSeriesProgress({
            tmdbId: SAMPLE_SERIES.breakingBad.tmdbId,
            title: SAMPLE_SERIES.breakingBad.title,
            posterPath: SAMPLE_SERIES.breakingBad.posterPath,
            seasonNumber: 1,
            totalEpisodes: 7,
            currentEpisode: 2,
            genres: SAMPLE_SERIES.breakingBad.genres
        });

        const seriesB = await addSeriesProgress({
            tmdbId: SAMPLE_SERIES.succession.tmdbId,
            title: SAMPLE_SERIES.succession.title,
            posterPath: SAMPLE_SERIES.succession.posterPath,
            seasonNumber: 1,
            totalEpisodes: 10,
            currentEpisode: 4,
            genres: SAMPLE_SERIES.succession.genres
        });

        const list = await getSeriesProgressList();
        expect(list.length).toBeGreaterThanOrEqual(2);
        const ids = list.map((s) => s.tmdbId);
        expect(ids).toContain(SAMPLE_SERIES.breakingBad.tmdbId);
        expect(ids).toContain(SAMPLE_SERIES.succession.tmdbId);
        expect(list.every((s) => s.status === "watching")).toBe(true);
    });

    it("T1-R2-02: Daily check-in (Assistimos hoje) with multi-episode session tag", async () => {
        const series = await addSeriesProgress({
            tmdbId: "tv-multi",
            title: "Succession",
            seasonNumber: 1,
            currentEpisode: 2,
            totalEpisodes: 10,
            genres: ["Drama"]
        });

        const checkin = await addSeriesCheckin({
            seriesProgressId: series.id,
            dateWatched: "2026-11-16",
            episodeStart: 3,
            episodeEnd: 4
        });

        expect(checkin.episodeTag).toBe("S01 • Eps 3-4");
        expect(checkin.episodeStart).toBe(3);
        expect(checkin.episodeEnd).toBe(4);

        const prisma = getTestPrisma();
        const updatedProgress = await (prisma as any).seriesProgress.findUnique({
            where: { id: series.id }
        });
        expect(updatedProgress?.currentEpisode).toBe(4);
    });

    it("T1-R2-03: Single-episode check-in session tag formatting", async () => {
        const series = await addSeriesProgress({
            tmdbId: "tv-single",
            title: "Dark",
            seasonNumber: 2,
            currentEpisode: 0,
            totalEpisodes: 8,
            genres: ["Sci-Fi"]
        });

        const checkin = await addSeriesCheckin({
            seriesProgressId: series.id,
            dateWatched: "2026-11-16",
            episodeStart: 1,
            episodeEnd: 1
        });

        expect(checkin.episodeTag).toBe("S02 • Ep 1");
        expect(checkin.episodeStart).toBe(1);
        expect(checkin.episodeEnd).toBe(1);

        const prisma = getTestPrisma();
        const updatedProgress = await (prisma as any).seriesProgress.findUnique({
            where: { id: series.id }
        });
        expect(updatedProgress?.currentEpisode).toBe(1);
    });

    it("T1-R2-04: Retroactive season completion with season selection and multi-day interactive date selection", async () => {
        const review = await addMovieReview({
            tmdbId: SAMPLE_SERIES.severance.tmdbId,
            title: SAMPLE_SERIES.severance.title,
            posterPath: SAMPLE_SERIES.severance.posterPath,
            mediaType: "tv",
            seasonNumber: 1,
            seasonName: "1ª Temporada",
            totalEpisodes: 9,
            episodesWatched: 9,
            runtimePerEpisode: 55,
            runtime: 9 * 55,
            watchedDates: ["2026-11-10", "2026-11-12", "2026-11-14"],
            dateWatched: "2026-11-14",
            ratingUser1: 4.5,
            ratingUser2: 5.0,
            textReview: "Maravilhosa do início ao fim!",
            genres: ["Drama", "Sci-Fi"],
            recommendedById: USER_1.id
        });

        expect(review.mediaType).toBe("tv");
        expect(review.seasonNumber).toBe(1);
        expect(review.totalEpisodes).toBe(9);
        expect(review.episodesWatched).toBe(9);
        expect(review.status).toBe("completed");
        expect(review.runtime).toBe(9 * 55); // 495 min
        expect(JSON.parse(review.watchedDates!)).toEqual([
            "2026-11-10",
            "2026-11-12",
            "2026-11-14"
        ]);
    });

    it("T1-R2-05: Cancel and delete in-progress series without history pollution", async () => {
        const series = await addSeriesProgress({
            tmdbId: "tv-cancel",
            title: "Discarded Series",
            totalEpisodes: 10,
            genres: ["Action"]
        });

        await addSeriesCheckin({
            seriesProgressId: series.id,
            dateWatched: "2026-11-10",
            episodeStart: 1,
            episodeEnd: 2
        });

        const result = await deleteSeriesProgress(series.id);
        expect(result.success).toBe(true);

        const prisma = getTestPrisma();
        const remainingProgress = await (prisma as any).seriesProgress.findUnique({
            where: { id: series.id }
        });
        expect(remainingProgress).toBeNull();

        const checkins = await (prisma as any).seriesCheckin.findMany({
            where: { seriesProgressId: series.id }
        });
        expect(checkins.length).toBe(0);

        const reviews = await prisma.movieReview.findMany({
            where: { tmdbId: "tv-cancel" }
        });
        expect(reviews.length).toBe(0);
    });

    it("T1-R2-06: Series abandonment with light review and reason", async () => {
        const series = await addSeriesProgress({
            tmdbId: SAMPLE_SERIES.theIdol.tmdbId,
            title: SAMPLE_SERIES.theIdol.title,
            totalEpisodes: 6,
            currentEpisode: 2,
            runtimePerEpisode: 55,
            genres: ["Drama"]
        });

        const review = await abandonSeriesProgress(series.id, {
            abandonedReason: "Ficou chata",
            ratingUser1: 1.5,
            ratingUser2: 1.0,
            textReview: "Desistimos no ep 2.",
            episodesWatched: 2
        });

        expect(review.status).toBe("abandoned");
        expect(review.abandonedReason).toBe("Ficou chata");
        expect(review.episodesWatched).toBe(2);
        expect(review.runtime).toBe(2 * 55); // 110 min

        const activeList = await getSeriesProgressList();
        expect(activeList.some((s) => s.id === series.id)).toBe(false);
    });
});
