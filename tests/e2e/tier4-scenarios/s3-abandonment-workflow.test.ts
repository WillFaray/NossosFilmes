import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
    setupTestDb,
    teardownTestDb,
    resetTestDb,
    addSeriesProgress,
    addSeriesCheckin,
    abandonSeriesProgress,
    getSeriesProgressList,
    getReviews,
    calculateTotalWatchTime,
    getProfilesStats,
    USER_1
} from "../harness";
import { SAMPLE_SERIES } from "../fixtures/sample-series";

describe("Tier 4 - Scenario 3: Abandonment Workflow After Partial Watch", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("T4-SCENARIO-03: Dropping series after 2 episodes with quick reason preserves time and clears queue", async () => {
        // 1. Start series "The Idol" (6 episodes, 55 min/ep)
        const series = await addSeriesProgress({
            tmdbId: SAMPLE_SERIES.theIdol.tmdbId,
            title: SAMPLE_SERIES.theIdol.title,
            seasonNumber: 1,
            totalEpisodes: 6,
            currentEpisode: 0,
            runtimePerEpisode: 55,
            genres: SAMPLE_SERIES.theIdol.genres
        });

        // 2. Day 1: Check-in Ep 1
        await addSeriesCheckin({
            seriesProgressId: series.id,
            dateWatched: "2026-11-10",
            episodeStart: 1,
            episodeEnd: 1
        });

        // 3. Day 2: Check-in Ep 2
        await addSeriesCheckin({
            seriesProgressId: series.id,
            dateWatched: "2026-11-11",
            episodeStart: 2,
            episodeEnd: 2
        });

        // 4. Day 3: Abandon series with quick reason "Ficou chata"
        const review = await abandonSeriesProgress(series.id, {
            abandonedReason: "Ficou chata",
            ratingUser1: 1.5,
            ratingUser2: 1.0,
            textReview: "Tentamos dar uma chance, mas não rolou. Muito fraca.",
            episodesWatched: 2,
            recommendedById: USER_1.id
        });

        // 5. In-progress queue is cleared
        const activeList = await getSeriesProgressList();
        expect(activeList.length).toBe(0);

        // 6. Review record invariants
        expect(review.status).toBe("abandoned");
        expect(review.abandonedReason).toBe("Ficou chata");
        expect(review.totalEpisodes).toBe(6);
        expect(review.episodesWatched).toBe(2);
        // Only 2 episodes credited: 2 * 55 = 110 min (1h 50m), NOT 6 * 55 = 330 min
        expect(review.runtime).toBe(110);

        // 7. Watch time invariant
        const allReviews = await getReviews();
        const stats = calculateTotalWatchTime(allReviews.map((r) => ({ review: r })));
        expect(stats.totalMinutes).toBe(110);
        expect(stats.formattedTime).toBe("1h 50m");

        // 8. Profiles stats invariant
        const profileStats = getProfilesStats(allReviews.map((r) => ({ review: r })));
        expect(profileStats.totalSeries).toBe(1);
        expect(profileStats.totalMinutes).toBe(110);
    });
});
