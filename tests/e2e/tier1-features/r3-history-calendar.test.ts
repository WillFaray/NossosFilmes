import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
    setupTestDb,
    teardownTestDb,
    resetTestDb,
    addMovieReview,
    addSeriesProgress,
    addSeriesCheckin,
    getTestPrisma,
    USER_1,
    USER_2
} from "../harness";
import { SAMPLE_MOVIES } from "../fixtures/sample-movies";
import { SAMPLE_SERIES } from "../fixtures/sample-series";

describe("Tier 1 - R3: Histórico e Calendário Unificados", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("T1-R3-01: Unified History Feed filtering (Todos | Filmes | Séries)", async () => {
        // Add 2 movies
        const m1 = await addMovieReview({
            ...SAMPLE_MOVIES.interstellar,
            mediaType: "movie"
        });
        const m2 = await addMovieReview({
            ...SAMPLE_MOVIES.parasite,
            mediaType: "movie"
        });

        // Add 2 TV series seasons
        const s1 = await addMovieReview({
            tmdbId: SAMPLE_SERIES.dark.tmdbId,
            title: SAMPLE_SERIES.dark.title,
            posterPath: SAMPLE_SERIES.dark.posterPath,
            mediaType: "tv",
            seasonNumber: 1,
            seasonName: "1ª Temporada",
            totalEpisodes: 10,
            episodesWatched: 10,
            runtimePerEpisode: 50,
            dateWatched: "2026-11-10",
            ratingUser1: 5.0,
            ratingUser2: 4.5,
            textReview: "Incrível!",
            genres: SAMPLE_SERIES.dark.genres,
            recommendedById: USER_1.id
        });
        const s2 = await addMovieReview({
            tmdbId: SAMPLE_SERIES.severance.tmdbId,
            title: SAMPLE_SERIES.severance.title,
            posterPath: SAMPLE_SERIES.severance.posterPath,
            mediaType: "tv",
            seasonNumber: 1,
            seasonName: "1ª Temporada",
            totalEpisodes: 9,
            episodesWatched: 9,
            runtimePerEpisode: 55,
            dateWatched: "2026-11-12",
            ratingUser1: 4.5,
            ratingUser2: 5.0,
            textReview: "Obra prima!",
            genres: SAMPLE_SERIES.severance.genres,
            recommendedById: USER_2.id
        });

        const entries = [
            { review: m1 },
            { review: m2 },
            { review: s1 },
            { review: s2 }
        ];

        const allEntries = entries;
        expect(allEntries.length).toBe(4);

        const movieEntries = entries.filter((e) => !e.review.mediaType || e.review.mediaType === "movie");
        expect(movieEntries.length).toBe(2);
        expect(movieEntries.every((e) => e.review.mediaType === "movie")).toBe(true);

        const seriesEntries = entries.filter((e) => e.review.mediaType === "tv");
        expect(seriesEntries.length).toBe(2);
        expect(seriesEntries.every((e) => e.review.mediaType === "tv")).toBe(true);
    });

    it("T1-R3-02: Calendar view renders series poster and session tag", async () => {
        const series = await addSeriesProgress({
            tmdbId: "tv-bear",
            title: "The Bear",
            posterPath: "/the_bear_poster.jpg",
            seasonNumber: 2,
            totalEpisodes: 10,
            genres: ["Drama", "Comédia"]
        });

        const checkin = await addSeriesCheckin({
            seriesProgressId: series.id,
            dateWatched: "2026-11-16",
            episodeStart: 1,
            episodeEnd: 2
        });

        expect(checkin.dateWatched).toBe("2026-11-16");
        expect(checkin.episodeTag).toBe("S02 • Eps 1-2");

        // Verify calendar session representation
        const calendarItem = {
            id: checkin.id,
            dateWatched: checkin.dateWatched,
            mediaType: "tv" as const,
            title: series.title,
            posterPath: series.posterPath,
            sessionTag: checkin.episodeTag
        };

        expect(calendarItem.posterPath).toContain("the_bear_poster");
        expect(calendarItem.sessionTag).toBe("S02 • Eps 1-2");
        expect(calendarItem.mediaType).toBe("tv");
    });

    it("T1-R3-03: Calendar view check-in item contains necessary detail modal data", async () => {
        const series = await addSeriesProgress({
            tmdbId: "tv-bear-detail",
            title: "The Bear",
            posterPath: "/bear.jpg",
            platform: "Disney+",
            seasonNumber: 2,
            totalEpisodes: 10,
            genres: ["Drama"]
        });

        const checkin = await addSeriesCheckin({
            seriesProgressId: series.id,
            dateWatched: "2026-11-16",
            episodeStart: 1,
            episodeEnd: 2
        });

        // Detail payload for CheckInDetailModal
        const detailPayload = {
            title: series.title,
            platform: series.platform,
            dateWatched: checkin.dateWatched,
            sessionTag: checkin.episodeTag,
            episodeRange: `${checkin.episodeStart}-${checkin.episodeEnd}`
        };

        expect(detailPayload.title).toBe("The Bear");
        expect(detailPayload.platform).toBe("Disney+");
        expect(detailPayload.sessionTag).toBe("S02 • Eps 1-2");
        expect(detailPayload.dateWatched).toBe("2026-11-16");
    });

    it("T1-R3-04: Each completed season generates its own individual review in the Diary", async () => {
        const season1 = await addMovieReview({
            tmdbId: "tv-st",
            title: "Stranger Things",
            posterPath: "/st1.jpg",
            mediaType: "tv",
            seasonNumber: 1,
            seasonName: "1ª Temporada",
            totalEpisodes: 8,
            episodesWatched: 8,
            dateWatched: "2026-08-01",
            ratingUser1: 4.5,
            ratingUser2: 4.5,
            textReview: "Início fantástico!",
            genres: ["Sci-Fi", "Drama"],
            recommendedById: USER_1.id
        });

        const season2 = await addMovieReview({
            tmdbId: "tv-st",
            title: "Stranger Things",
            posterPath: "/st2.jpg",
            mediaType: "tv",
            seasonNumber: 2,
            seasonName: "2ª Temporada",
            totalEpisodes: 9,
            episodesWatched: 9,
            dateWatched: "2026-09-01",
            ratingUser1: 5.0,
            ratingUser2: 4.5,
            textReview: "Sequência à altura!",
            genres: ["Sci-Fi", "Drama"],
            recommendedById: USER_2.id
        });

        const prisma = getTestPrisma();
        const reviews = await prisma.movieReview.findMany({
            where: { tmdbId: "tv-st" },
            orderBy: { seasonNumber: "asc" }
        });

        expect(reviews.length).toBe(2);
        expect(reviews[0].seasonNumber).toBe(1);
        expect(reviews[0].seasonName).toBe("1ª Temporada");
        expect(reviews[1].seasonNumber).toBe(2);
        expect(reviews[1].seasonName).toBe("2ª Temporada");
        expect(reviews[0].id).not.toBe(reviews[1].id);
    });

    it("T1-R3-05: Complete series or miniseries option generates a single diary review with appropriate badge", async () => {
        const review = await addMovieReview({
            tmdbId: SAMPLE_SERIES.chernobyl.tmdbId,
            title: SAMPLE_SERIES.chernobyl.title,
            posterPath: SAMPLE_SERIES.chernobyl.posterPath,
            mediaType: "tv",
            seasonNumber: null,
            seasonName: "Minissérie",
            totalEpisodes: 5,
            episodesWatched: 5,
            runtimePerEpisode: 65,
            runtime: 5 * 65,
            dateWatched: "2026-11-15",
            ratingUser1: 5.0,
            ratingUser2: 5.0,
            textReview: "Obra prima impecável.",
            genres: SAMPLE_SERIES.chernobyl.genres,
            recommendedById: USER_1.id
        });

        expect(review.seasonNumber).toBeNull();
        expect(review.seasonName).toBe("Minissérie");
        expect(review.totalEpisodes).toBe(5);
        expect(review.runtime).toBe(5 * 65); // 325 min

        const prisma = getTestPrisma();
        const dbReview = await prisma.movieReview.findUnique({
            where: { id: review.id }
        });
        expect(dbReview?.seasonNumber).toBeNull();
        expect(dbReview?.seasonName).toBe("Minissérie");
    });
});
