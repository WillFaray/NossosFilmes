import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
    setupTestDb,
    teardownTestDb,
    resetTestDb,
    addMovieReview,
    getSeriesProgressList,
    calculateTotalWatchTime,
    calculateHeadToHeadStats,
    getTestPrisma,
    USER_1
} from "../harness";
import { SAMPLE_SERIES } from "../fixtures/sample-series";

describe("Tier 4 - Scenario 2: Retroactive Holiday Binge Weekend", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("T4-SCENARIO-02: Direct miniseries registration via multi-day date range without creating in-progress clutter", async () => {
        const prisma = getTestPrisma();

        // 1. Direct registration of Chernobyl (Minissérie / Série Completa)
        // Multi-day date selection: Nov 13 to Nov 15 (3 days)
        const review = await addMovieReview({
            tmdbId: SAMPLE_SERIES.chernobyl.tmdbId,
            title: SAMPLE_SERIES.chernobyl.title,
            posterPath: SAMPLE_SERIES.chernobyl.posterPath,
            mediaType: "tv",
            seasonNumber: null, // Complete miniseries
            seasonName: "Minissérie",
            totalEpisodes: 5,
            episodesWatched: 5,
            runtimePerEpisode: 65,
            watchedDates: ["2026-11-13", "2026-11-14", "2026-11-15"],
            dateWatched: "2026-11-15",
            ratingUser1: 5.0,
            ratingUser2: 5.0,
            textReview: "Intenso, angustiante e brilhante. Uma das melhores produções já feitas.",
            platform: "Max",
            genres: SAMPLE_SERIES.chernobyl.genres,
            recommendedById: USER_1.id
        });

        // 2. Active in-progress queue remains empty
        const activeList = await getSeriesProgressList();
        expect(activeList.length).toBe(0);

        // 3. Database invariants
        expect(review.mediaType).toBe("tv");
        expect(review.seasonNumber).toBeNull();
        expect(review.seasonName).toBe("Minissérie");
        expect(review.totalEpisodes).toBe(5);
        expect(review.episodesWatched).toBe(5);
        expect(review.runtimePerEpisode).toBe(65);
        expect(review.runtime).toBe(325); // 5 * 65 min = 5h 25m

        const savedDates = JSON.parse(review.watchedDates!);
        expect(savedDates).toEqual(["2026-11-13", "2026-11-14", "2026-11-15"]);

        // 4. Watched time calculation
        const stats = calculateTotalWatchTime([{ review }]);
        expect(stats.totalMinutes).toBe(325);
        expect(stats.formattedTime).toBe("5h 25m");

        // 5. Couple affinity 100% agreement
        const headToHead = calculateHeadToHeadStats([{ review }]);
        expect(headToHead?.affinityPercentage).toBe(100);
    });
});
