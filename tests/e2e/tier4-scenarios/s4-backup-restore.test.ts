import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
    setupTestDb,
    teardownTestDb,
    resetTestDb,
    addMovieReview,
    addSeriesProgress,
    addSeriesCheckin,
    addToWatchlist,
    exportData,
    importData,
    calculateTotalWatchTime,
    getTestPrisma,
    ROOT_DIR,
    USER_1,
    USER_2
} from "../harness";

describe("Tier 4 - Scenario 4: Full Database Migration, Legacy v1 Restore & v2 Round-Trip", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("T4-SCENARIO-04: Full round-trip testing of legacy v1 snapshot restore and modern v2 backup parity", async () => {
        const prisma = getTestPrisma();

        // 1. PHASE 1: Populate database with modern mixed state
        // 2 movies
        await addMovieReview({
            tmdbId: "m-phase-1",
            title: "Phase 1 Movie",
            posterPath: "/p1.jpg",
            dateWatched: "2026-11-01",
            ratingUser1: 4.5,
            ratingUser2: 4.5,
            textReview: "Movie review",
            genres: ["Ação"],
            recommendedById: USER_1.id,
            runtime: 120
        });

        // 1 completed series season: 10 eps * 50 min = 500 min
        await addMovieReview({
            tmdbId: "tv-phase-1",
            title: "Phase 1 Series",
            posterPath: "/s1.jpg",
            dateWatched: "2026-11-02",
            ratingUser1: 5.0,
            ratingUser2: 5.0,
            textReview: "Series review",
            genres: ["Drama"],
            recommendedById: USER_2.id,
            mediaType: "tv",
            seasonNumber: 1,
            totalEpisodes: 10,
            episodesWatched: 10,
            runtimePerEpisode: 50
        });

        // 1 active series in progress with checkin
        const prog = await addSeriesProgress({
            tmdbId: "tv-phase-prog",
            title: "In Progress Show",
            seasonNumber: 1,
            totalEpisodes: 8,
            currentEpisode: 2
        });
        await addSeriesCheckin({
            seriesProgressId: prog.id,
            dateWatched: "2026-11-05",
            episodeStart: 1,
            episodeEnd: 2
        });

        // 1 watchlist item
        await addToWatchlist({
            tmdbId: "tv-phase-wl",
            title: "Watchlist Show",
            mediaType: "tv",
            numberOfSeasons: 2,
            addedById: USER_1.id
        });

        // Export v2 state
        const v2State = await exportData();
        expect(v2State.version).toBeGreaterThanOrEqual(2);
        expect(v2State.reviews.length).toBe(2);
        expect(v2State.seriesProgress!.length).toBe(1);
        expect(v2State.watchlist.length).toBe(1);

        const v2Stats = calculateTotalWatchTime(v2State.reviews.map((r) => ({ review: r })));
        expect(v2Stats.totalMinutes).toBe(620); // 120 + 500

        // 2. PHASE 2: Ingest real legacy v1 backup (56 movies, 5 watchlist items)
        const v1FixturePath = path.resolve(ROOT_DIR, "tests/e2e/fixtures/backup-v1-legacy.json");
        const legacyV1Payload = JSON.parse(fs.readFileSync(v1FixturePath, "utf-8"));

        const v1Result = await importData(legacyV1Payload);
        expect(v1Result.users).toBe(2);
        expect(v1Result.reviews).toBe(56);
        expect(v1Result.watchlist).toBe(5);

        // Verify all 56 legacy reviews loaded cleanly without schema errors
        const v1DbReviews = await prisma.movieReview.findMany();
        expect(v1DbReviews.length).toBe(56);
        expect(v1DbReviews.every((r) => !r.mediaType || r.mediaType === "movie")).toBe(true);

        const v1ActiveProgress = await (prisma as any).seriesProgress.count();
        expect(v1ActiveProgress).toBe(0);

        // 3. PHASE 3: Restore v2 backup and verify structural parity
        const v2Result = await importData(v2State);
        expect(v2Result.users).toBe(2);
        expect(v2Result.reviews).toBe(2);
        expect(v2Result.watchlist).toBe(1);

        const restoredProgress = await (prisma as any).seriesProgress.findMany();
        expect(restoredProgress.length).toBe(1);
        expect(restoredProgress[0].title).toBe("In Progress Show");

        const restoredReviews = await prisma.movieReview.findMany();
        const restoredStats = calculateTotalWatchTime(restoredReviews.map((r) => ({ review: r })));
        expect(restoredStats.totalMinutes).toBe(v2Stats.totalMinutes);
        expect(restoredStats.formattedTime).toBe(v2Stats.formattedTime);
    });
});
