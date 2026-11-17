import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
    setupTestDb,
    teardownTestDb,
    resetTestDb,
    addMovieReview,
    addSeriesProgress,
    completeSeriesProgress,
    calculateTotalWatchTime,
    getEntryDurationMinutes,
    getReviews,
    USER_1
} from "../harness";

describe("Tier 3 - Pairwise 3: Concluding Series Season & Total Watch Time (R2 × R5)", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("T3-PAIR-03: Concluding series season updates total watched time incrementally", async () => {
        // 1. Baseline: 2 movies (120 min + 90 min = 210 min)
        await addMovieReview({
            tmdbId: "m-base-1",
            title: "Baseline Movie 1",
            posterPath: "/b1.jpg",
            dateWatched: "2026-11-01",
            ratingUser1: 4.0,
            ratingUser2: 4.0,
            textReview: "Filme 1",
            genres: ["Ação"],
            recommendedById: USER_1.id,
            runtime: 120
        });

        await addMovieReview({
            tmdbId: "m-base-2",
            title: "Baseline Movie 2",
            posterPath: "/b2.jpg",
            dateWatched: "2026-11-02",
            ratingUser1: 4.0,
            ratingUser2: 4.0,
            textReview: "Filme 2",
            genres: ["Comédia"],
            recommendedById: USER_1.id,
            runtime: 90
        });

        const baselineReviews = await getReviews();
        const baselineStats = calculateTotalWatchTime(baselineReviews.map((r) => ({ review: r })));
        expect(baselineStats.totalMinutes).toBe(210);

        // 2. In-progress series: Severance at 9/9 episodes, 55 min/ep
        const severance = await addSeriesProgress({
            tmdbId: "95396",
            title: "Severance",
            seasonNumber: 1,
            totalEpisodes: 9,
            currentEpisode: 9,
            runtimePerEpisode: 55
        });

        // 3. Complete season
        const review = await completeSeriesProgress(severance.id, {
            ratingUser1: 5.0,
            ratingUser2: 4.5,
            textReview: "Final de temporada espetacular!",
            platform: "Apple TV+",
            watchedDates: ["2026-11-10", "2026-11-11", "2026-11-12"],
            recommendedById: USER_1.id
        });

        expect(review.mediaType).toBe("tv");
        expect(review.seasonNumber).toBe(1);
        expect(review.totalEpisodes).toBe(9);
        expect(review.episodesWatched).toBe(9);
        expect(review.runtimePerEpisode).toBe(55);
        expect(review.runtime).toBe(495); // 9 * 55

        // Check getEntryDurationMinutes contract
        const duration = getEntryDurationMinutes({ review });
        expect(duration.minutes).toBe(495);

        // 4. Compute updated total watch time: 210 + 495 = 705 min (11h 45m)
        const updatedReviews = await getReviews();
        const updatedStats = calculateTotalWatchTime(updatedReviews.map((r) => ({ review: r })));
        expect(updatedStats.totalMinutes).toBe(705);
        expect(updatedStats.formattedTime).toBe("11h 45m");
    });
});
