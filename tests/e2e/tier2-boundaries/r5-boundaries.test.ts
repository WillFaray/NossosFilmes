import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
    setupTestDb,
    teardownTestDb,
    resetTestDb,
    addMovieReview,
    deleteMovieReview,
    getReviews,
    calculateTotalWatchTime,
    getEntryDurationMinutes,
    parseRuntimeInput,
    USER_1
} from "../harness";

describe("Tier 2 - R5: Tempo Total Assistido Boundaries", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("T2-R5-01: Zero or null runtime handling in series review falls back to 45 min per episode", () => {
        const duration = getEntryDurationMinutes({
            movie: { mediaType: "tv" },
            review: {
                mediaType: "tv",
                episodesWatched: 5,
                runtimePerEpisode: 0
            }
        });

        // 5 * 45 = 225 min
        expect(duration.minutes).toBe(225);
        expect(duration.isEstimated).toBe(true);
    });

    it("T2-R5-02: Micro-duration calculation for short-format series", () => {
        const stats = calculateTotalWatchTime([
            { review: { runtime: 3, mediaType: "tv" } }
        ]);

        expect(stats.totalMinutes).toBe(3);
        expect(stats.formattedTime).toBe("3m");
    });

    it("T2-R5-03: Mega-marathon large episode count calculation without arithmetic overflow", () => {
        // 500 episodes * 25 min = 12,500 min = 208 hours and 20 minutes
        const stats = calculateTotalWatchTime([
            { review: { runtime: 12500, mediaType: "tv" } }
        ]);

        expect(stats.totalMinutes).toBe(12500);
        expect(stats.formattedTime).toBe("208h 20m");
    });

    it("T2-R5-04: Invalid user-inputted runtime string is sanitized to fallback", () => {
        const fallback = 45;

        // Negative input
        const parsedNeg = parseRuntimeInput("-40", fallback);
        expect(parsedNeg).toBe(fallback);

        // Non-numeric string
        const parsedNaN = parseRuntimeInput("abc", fallback);
        expect(parsedNaN).toBe(fallback);

        // Valid numeric string
        const parsedValid = parseRuntimeInput("60", fallback);
        expect(parsedValid).toBe(60);
    });

    it("T2-R5-05: Synchronous watch time reduction on review deletion", async () => {
        const r1 = await addMovieReview({
            tmdbId: "m-r1",
            title: "Movie 1",
            posterPath: "/p1.jpg",
            dateWatched: "2026-11-01",
            ratingUser1: 4.0,
            ratingUser2: 4.0,
            textReview: "Legal",
            genres: ["Ação"],
            recommendedById: USER_1.id,
            runtime: 120
        });

        const r2 = await addMovieReview({
            tmdbId: "tv-r2",
            title: "Series 2",
            posterPath: "/p2.jpg",
            dateWatched: "2026-11-02",
            ratingUser1: 5.0,
            ratingUser2: 5.0,
            textReview: "Maravilha",
            genres: ["Drama"],
            recommendedById: USER_1.id,
            mediaType: "tv",
            totalEpisodes: 4,
            episodesWatched: 4,
            runtimePerEpisode: 50,
            runtime: 200
        });

        const allReviewsBefore = await getReviews();
        const statsBefore = calculateTotalWatchTime(allReviewsBefore.map((r) => ({ review: r })));
        // 120 + 200 = 320 min
        expect(statsBefore.totalMinutes).toBe(320);

        // Delete series review (200 min)
        await deleteMovieReview(r2.id);

        const allReviewsAfter = await getReviews();
        const statsAfter = calculateTotalWatchTime(allReviewsAfter.map((r) => ({ review: r })));
        expect(statsAfter.totalMinutes).toBe(120);
        expect(statsAfter.formattedTime).toBe("2h");
    });

    it("T2-R5-06: Movie fallback boundary is 110 minutes for undefined/zero duration", () => {
        const res = getEntryDurationMinutes({
            movie: { mediaType: "movie", runtime: 0 }
        });
        expect(res.minutes).toBe(110);
        expect(res.isEstimated).toBe(true);
    });
});
