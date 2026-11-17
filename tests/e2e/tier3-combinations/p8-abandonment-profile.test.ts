import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
    setupTestDb,
    teardownTestDb,
    resetTestDb,
    addSeriesProgress,
    addSeriesCheckin,
    abandonSeriesProgress,
    getSeriesProgressList,
    getProfilesStats,
    getReviews,
    getTestPrisma
} from "../harness";

describe("Tier 3 - Pairwise 8: Partial Abandonment & Profile Retention (R2 × R6)", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("T3-PAIR-08: Partial abandonment with custom reason preserves watch time in profiles", async () => {
        const prisma = getTestPrisma();

        // 1. Series Westworld in progress: 10 episodes, 60 min/ep
        const series = await addSeriesProgress({
            tmdbId: "tv-westworld",
            title: "Westworld",
            seasonNumber: 1,
            totalEpisodes: 10,
            currentEpisode: 0,
            runtimePerEpisode: 60,
            genres: ["Sci-Fi", "Drama"]
        });

        // 2. Watch 3 episodes across 2 check-ins
        await addSeriesCheckin({
            seriesProgressId: series.id,
            dateWatched: "2026-11-10",
            episodeStart: 1,
            episodeEnd: 2
        });

        await addSeriesCheckin({
            seriesProgressId: series.id,
            dateWatched: "2026-11-11",
            episodeStart: 3,
            episodeEnd: 3
        });

        // 3. Couple abandons series at episode 3 with reason "Ficou confusa"
        const review = await abandonSeriesProgress(series.id, {
            abandonedReason: "Ficou confusa",
            ratingUser1: 2.0,
            ratingUser2: 2.5,
            textReview: "Primeira temporada começou bem, depois se perdeu.",
            episodesWatched: 3
        });

        // 4. Invariants on Review
        expect(review.status).toBe("abandoned");
        expect(review.abandonedReason).toBe("Ficou confusa");
        expect(review.totalEpisodes).toBe(10);
        expect(review.episodesWatched).toBe(3);
        // Runtime credited: 3 * 60 = 180 min (3h 0m), NOT 10 * 60 = 600 min
        expect(review.runtime).toBe(180);

        // 5. Invariant on In-Progress list: removed from active queue
        const activeList = await getSeriesProgressList();
        expect(activeList.some((s) => s.id === series.id)).toBe(false);

        // 6. Invariant on Profile Stats
        const allReviews = await getReviews();
        const profileStats = getProfilesStats(allReviews.map((r) => ({ review: r })));
        expect(profileStats.totalMinutes).toBe(180);
        expect(profileStats.totalFormattedTime).toBe("3h");
        expect(profileStats.totalSeries).toBe(1);
    });
});
