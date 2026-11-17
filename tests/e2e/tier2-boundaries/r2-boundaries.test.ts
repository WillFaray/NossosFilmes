import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
    setupTestDb,
    teardownTestDb,
    resetTestDb,
    addSeriesProgress,
    addSeriesCheckin,
    addMovieReview,
    getTestPrisma,
    USER_1,
    USER_2
} from "../harness";

describe("Tier 2 - R2: Modelo Híbrido Séries Boundaries", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("T2-R2-01: Single episode boundary check-in (Episode 1 of 1)", async () => {
        const series = await addSeriesProgress({
            tmdbId: "tv-pilot-1",
            title: "Special Mini Pilot",
            seasonNumber: 1,
            totalEpisodes: 1,
            currentEpisode: 0
        });

        const checkin = await addSeriesCheckin({
            seriesProgressId: series.id,
            dateWatched: "2026-11-16",
            episodeStart: 1,
            episodeEnd: 1
        });

        expect(checkin.episodeTag).toBe("S01 • Ep 1");
        expect(checkin.episodeStart).toBe(1);
        expect(checkin.episodeEnd).toBe(1);

        const prisma = getTestPrisma();
        const p = await (prisma as any).seriesProgress.findUnique({ where: { id: series.id } });
        expect(p?.currentEpisode).toBe(1);
        expect(p?.currentEpisode).toBe(p?.totalEpisodes);
    });

    it("T2-R2-02: Check-in final episode boundary (episodeEnd === totalEpisodes)", async () => {
        const series = await addSeriesProgress({
            tmdbId: "tv-finale",
            title: "Season Finale Series",
            seasonNumber: 1,
            totalEpisodes: 10,
            currentEpisode: 8
        });

        const checkin = await addSeriesCheckin({
            seriesProgressId: series.id,
            dateWatched: "2026-11-16",
            episodeStart: 9,
            episodeEnd: 10
        });

        expect(checkin.episodeTag).toBe("S01 • Eps 9-10");

        const prisma = getTestPrisma();
        const p = await (prisma as any).seriesProgress.findUnique({ where: { id: series.id } });
        expect(p?.currentEpisode).toBe(10);
        expect(p?.currentEpisode).toBeLessThanOrEqual(p?.totalEpisodes);
    });

    it("T2-R2-03: Invalid episode range rejection (inverted range or end > totalEpisodes)", async () => {
        const series = await addSeriesProgress({
            tmdbId: "tv-invalid-range",
            title: "Range Test Series",
            seasonNumber: 1,
            totalEpisodes: 10,
            currentEpisode: 2
        });

        // Inverted: start 5, end 3
        await expect(
            addSeriesCheckin({
                seriesProgressId: series.id,
                dateWatched: "2026-11-16",
                episodeStart: 5,
                episodeEnd: 3
            })
        ).rejects.toThrow(/Episódio final deve ser maior ou igual ao inicial|inválido/i);

        // Exceeds total episodes: start 5, end 99 on 10-episode series
        await expect(
            addSeriesCheckin({
                seriesProgressId: series.id,
                dateWatched: "2026-11-16",
                episodeStart: 5,
                episodeEnd: 99
            })
        ).rejects.toThrow(/excede/i);

        // Negative start
        await expect(
            addSeriesCheckin({
                seriesProgressId: series.id,
                dateWatched: "2026-11-16",
                episodeStart: 0,
                episodeEnd: 2
            })
        ).rejects.toThrow(/inválido/i);
    });

    it("T2-R2-04: Season boundary transition (completing S1 and starting S2)", async () => {
        // Complete Season 1
        const s1Review = await addMovieReview({
            tmdbId: "tv-twl",
            title: "The White Lotus",
            posterPath: "/twl.jpg",
            mediaType: "tv",
            seasonNumber: 1,
            seasonName: "1ª Temporada",
            totalEpisodes: 6,
            episodesWatched: 6,
            dateWatched: "2026-11-10",
            ratingUser1: 5.0,
            ratingUser2: 4.5,
            textReview: "Temporada 1 incrível!",
            genres: ["Comédia", "Drama"],
            recommendedById: USER_1.id
        });
        expect(s1Review.seasonNumber).toBe(1);

        // Start Season 2
        const s2 = await addSeriesProgress({
            tmdbId: "tv-twl",
            title: "The White Lotus",
            seasonNumber: 2,
            seasonName: "2ª Temporada",
            totalEpisodes: 7,
            currentEpisode: 0
        });

        expect(s2.seasonNumber).toBe(2);
        expect(s2.currentEpisode).toBe(0);

        const s2Checkin = await addSeriesCheckin({
            seriesProgressId: s2.id,
            dateWatched: "2026-11-16",
            episodeStart: 1,
            episodeEnd: 1
        });
        expect(s2Checkin.episodeTag).toBe("S02 • Ep 1");
    });

    it("T2-R2-05: Mini-calendar retroactive date selection edge cases (year-end crossing interval)", async () => {
        const rev = await addMovieReview({
            tmdbId: "tv-cross-year",
            title: "New Year Binge",
            posterPath: "/ny.jpg",
            mediaType: "tv",
            seasonNumber: 1,
            totalEpisodes: 3,
            episodesWatched: 3,
            watchedDates: ["2026-01-02", "2025-12-31", "2026-01-01"],
            dateWatched: "2026-01-02",
            ratingUser1: 4.5,
            ratingUser2: 4.5,
            textReview: "Maratona na virada!",
            genres: ["Drama"],
            recommendedById: USER_1.id
        });

        const savedDates = JSON.parse(rev.watchedDates!);
        // Invariant: dates are sorted chronologically
        expect(savedDates).toEqual(["2025-12-31", "2026-01-01", "2026-01-02"]);
    });

    it("T2-R2-06: Operations on non-existent seriesProgressId throw not found error", async () => {
        await expect(
            addSeriesCheckin({
                seriesProgressId: "non-existent-uuid-9999",
                dateWatched: "2026-11-16",
                episodeStart: 1,
                episodeEnd: 2
            })
        ).rejects.toThrow(/não encontrada/i);
    });
});
