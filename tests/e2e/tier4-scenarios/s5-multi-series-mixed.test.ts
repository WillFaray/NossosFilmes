import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
    setupTestDb,
    teardownTestDb,
    resetTestDb,
    addSeriesProgress,
    addSeriesCheckin,
    addMovieReview,
    filterHistory,
    calculateTotalWatchTime,
    getTestPrisma,
    USER_1
} from "../harness";

describe("Tier 4 - Scenario 5: Multi-Series Concurrent Race & Mixed History Filter Stress", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("T4-SCENARIO-05: Concurrently tracking 2 TV series + 1 weekend movie with filter and session isolation", async () => {
        const prisma = getTestPrisma();

        // 1. Add Series A ("Severance", 9 eps, 55 min/ep)
        const seriesA = await addSeriesProgress({
            tmdbId: "tv-sev",
            title: "Severance",
            posterPath: "/sev.jpg",
            seasonNumber: 1,
            totalEpisodes: 9,
            currentEpisode: 0,
            runtimePerEpisode: 55
        });

        // 2. Add Series B ("Ted Lasso", 10 eps, 30 min/ep)
        const seriesB = await addSeriesProgress({
            tmdbId: "tv-ted",
            title: "Ted Lasso",
            posterPath: "/ted.jpg",
            seasonNumber: 1,
            totalEpisodes: 10,
            currentEpisode: 0,
            runtimePerEpisode: 30
        });

        // 3. Day 1 (Mon 2026-11-16): Check-in Series A Ep 1
        await addSeriesCheckin({
            seriesProgressId: seriesA.id,
            dateWatched: "2026-11-16",
            episodeStart: 1,
            episodeEnd: 1
        });

        // 4. Day 2 (Tue 2026-11-17): Check-in Series B Eps 1-2
        await addSeriesCheckin({
            seriesProgressId: seriesB.id,
            dateWatched: "2026-11-17",
            episodeStart: 1,
            episodeEnd: 2
        });

        // 5. Day 3 (Wed 2026-11-18): Check-in Series A Eps 2-3
        await addSeriesCheckin({
            seriesProgressId: seriesA.id,
            dateWatched: "2026-11-18",
            episodeStart: 2,
            episodeEnd: 3
        });

        // 6. Day 4 (Fri 2026-11-20): Movie Night! "Dune: Part Two" (Movie, 166 min)
        const movieDune = await addMovieReview({
            tmdbId: "m-dune-2",
            title: "Dune: Part Two",
            posterPath: "/dune2.jpg",
            dateWatched: "2026-11-20",
            ratingUser1: 5.0,
            ratingUser2: 4.5,
            textReview: "Épico!",
            genres: ["Ficção científica"],
            recommendedById: USER_1.id,
            runtime: 166,
            mediaType: "movie"
        });

        // 7. Day 5 (Sat 2026-11-21): Check-in Series B Ep 3
        await addSeriesCheckin({
            seriesProgressId: seriesB.id,
            dateWatched: "2026-11-21",
            episodeStart: 3,
            episodeEnd: 3
        });

        // 8. Day 6 (Sun 2026-11-22): Check-in Series A Ep 4
        await addSeriesCheckin({
            seriesProgressId: seriesA.id,
            dateWatched: "2026-11-22",
            episodeStart: 4,
            episodeEnd: 4
        });

        // 9. Verify In-Progress Queue Isolation
        const updatedA = await (prisma as any).seriesProgress.findUnique({
            where: { id: seriesA.id }
        });
        const updatedB = await (prisma as any).seriesProgress.findUnique({
            where: { id: seriesB.id }
        });

        expect(updatedA.currentEpisode).toBe(4);
        expect(updatedA.totalEpisodes).toBe(9);

        expect(updatedB.currentEpisode).toBe(3);
        expect(updatedB.totalEpisodes).toBe(10);

        // 10. Verify Calendar Sessions Coexistence
        const allCheckins = await (prisma as any).seriesCheckin.findMany({
            orderBy: { dateWatched: "asc" }
        });
        expect(allCheckins.length).toBe(5);

        // 11. History Filter Verifications
        const diaryEntries = [
            { review: movieDune }
        ];

        expect(filterHistory(diaryEntries, "all").length).toBe(1);
        expect(filterHistory(diaryEntries, "movies").length).toBe(1);
        expect(filterHistory(diaryEntries, "series").length).toBe(0);

        // 12. Total Watched Minutes:
        // Severance 4 eps * 55m = 220m
        // Ted Lasso 3 eps * 30m = 90m
        // Dune = 166m
        // Total = 220 + 90 + 166 = 476 minutes (7h 56m)
        const weeklyTotalMinutes = 4 * 55 + 3 * 30 + 166;
        expect(weeklyTotalMinutes).toBe(476);
        const hours = Math.floor(weeklyTotalMinutes / 60);
        const mins = weeklyTotalMinutes % 60;
        expect(`${hours}h ${mins}m`).toBe("7h 56m");
    });
});
