import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
    setupTestDb,
    teardownTestDb,
    resetTestDb,
    addToWatchlist,
    getRouletteCandidates,
    spinRoulette,
    addSeriesProgress,
    addSeriesCheckin,
    completeSeriesProgress,
    getSeriesProgressList,
    getReviews,
    calculateTotalWatchTime,
    getProfilesStats,
    getTestPrisma,
    USER_1,
    USER_2
} from "../harness";

describe("Tier 4 - Scenario 1: Complete Couple TV Marathon Lifecycle", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("T4-SCENARIO-01: Full end-to-end lifecycle from watchlist to roulette, check-ins, season review, and stats", async () => {
        const prisma = getTestPrisma();

        // 1. Thácila adds "Dark" to Watchlist
        await addToWatchlist({
            tmdbId: "70523",
            title: "Dark",
            posterPath: "/dark.jpg",
            mediaType: "tv",
            numberOfSeasons: 3,
            numberOfEpisodes: 26,
            runtime: 50,
            addedById: USER_2.id
        });

        const initialWl = await prisma.watchlistItem.count();
        expect(initialWl).toBe(1);

        // 2. Couple opens Roulette with filter "Séries"
        const candidates = getRouletteCandidates(await prisma.watchlistItem.findMany() as any, { mediaFilter: "tv" });
        expect(candidates.length).toBe(1);
        const winner = spinRoulette(candidates);
        expect(winner.tmdbId).toBe("70523");

        // 3. Start marathon with auto-removal
        const series = await addSeriesProgress({
            tmdbId: winner.tmdbId,
            title: winner.title,
            posterPath: winner.posterPath,
            seasonNumber: 1,
            seasonName: "1ª Temporada",
            totalEpisodes: 10,
            runtimePerEpisode: 50,
            removeFromWatchlist: true
        });

        // Watchlist is cleared, active in-progress card shows 0/10 episodes
        expect(await prisma.watchlistItem.count()).toBe(0);
        expect(series.currentEpisode).toBe(0);
        expect(series.totalEpisodes).toBe(10);

        // 4. Session 1: Friday night (2026-11-20), Eps 1-2
        const checkin1 = await addSeriesCheckin({
            seriesProgressId: series.id,
            dateWatched: "2026-11-20",
            episodeStart: 1,
            episodeEnd: 2
        });
        expect(checkin1.episodeTag).toBe("S01 • Eps 1-2");

        // 5. Session 2: Saturday afternoon (2026-11-21), Ep 3
        const checkin2 = await addSeriesCheckin({
            seriesProgressId: series.id,
            dateWatched: "2026-11-21",
            episodeStart: 3,
            episodeEnd: 3
        });
        expect(checkin2.episodeTag).toBe("S01 • Ep 3");

        // 6. Session 3: Sunday binge (2026-11-22), Eps 4-10
        const checkin3 = await addSeriesCheckin({
            seriesProgressId: series.id,
            dateWatched: "2026-11-22",
            episodeStart: 4,
            episodeEnd: 10
        });
        expect(checkin3.episodeTag).toBe("S01 • Eps 4-10");

        // 7. Complete Season 1
        const review = await completeSeriesProgress(series.id, {
            ratingUser1: 5.0,
            ratingUser2: 4.5,
            textReview: "Obra-prima alemã, trilha sonora e roteiro impecáveis!",
            platform: "Netflix",
            watchedDates: ["2026-11-20", "2026-11-21", "2026-11-22"],
            recommendedById: USER_2.id
        });

        // 8. Full system verifications
        // In-progress queue is cleared
        const activeList = await getSeriesProgressList();
        expect(activeList.length).toBe(0);

        // Review record invariant
        expect(review.mediaType).toBe("tv");
        expect(review.seasonNumber).toBe(1);
        expect(review.totalEpisodes).toBe(10);
        expect(review.episodesWatched).toBe(10);
        expect(review.runtime).toBe(500); // 10 * 50
        expect(JSON.parse(review.watchedDates!)).toEqual([
            "2026-11-20",
            "2026-11-21",
            "2026-11-22"
        ]);

        // Calendar sessions invariant
        const checkins = await (prisma as any).seriesCheckin.findMany({
            where: { seriesProgressId: series.id },
            orderBy: { dateWatched: "asc" }
        });
        expect(checkins.length).toBe(3);
        expect(checkins[0].episodeTag).toBe("S01 • Eps 1-2");
        expect(checkins[1].episodeTag).toBe("S01 • Ep 3");
        expect(checkins[2].episodeTag).toBe("S01 • Eps 4-10");

        // Profiles watch time invariant
        const allReviews = await getReviews();
        const profileStats = getProfilesStats(allReviews.map((r) => ({ review: r })));
        expect(profileStats.totalSeries).toBe(1);
        expect(profileStats.totalMinutes).toBe(500);
        expect(profileStats.totalFormattedTime).toBe("8h 20m");
    });
});
