import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
    setupTestDb,
    teardownTestDb,
    resetTestDb,
    addMovieReview,
    filterHistory,
    getProfilesStats,
    getProfileCardData,
    USER_1,
    USER_2
} from "../harness";

describe("Tier 3 - Pairwise 4: Unified History & Profile Breakdown (R3 × R6)", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("T3-PAIR-04: Unified history filtering and dual user profile metric breakdown", async () => {
        // Movie 1: Rec by William, 100 min
        const m1 = await addMovieReview({
            tmdbId: "m-pair-1",
            title: "Movie William",
            posterPath: "/mw.jpg",
            dateWatched: "2026-11-01",
            ratingUser1: 4.5,
            ratingUser2: 4.0,
            textReview: "Boa indicação do William",
            genres: ["Ação"],
            recommendedById: USER_1.id,
            runtime: 100,
            mediaType: "movie"
        });

        // Movie 2: Rec by Thácila, 110 min
        const m2 = await addMovieReview({
            tmdbId: "m-pair-2",
            title: "Movie Thácila",
            posterPath: "/mt.jpg",
            dateWatched: "2026-11-02",
            ratingUser1: 4.0,
            ratingUser2: 5.0,
            textReview: "Linda indicação da Thácila",
            genres: ["Drama"],
            recommendedById: USER_2.id,
            runtime: 110,
            mediaType: "movie"
        });

        // Series Season 1: Rec by William, 8 eps @ 45m = 360 min
        const s1 = await addMovieReview({
            tmdbId: "tv-pair-1",
            title: "Series William",
            posterPath: "/sw.jpg",
            dateWatched: "2026-11-03",
            ratingUser1: 5.0,
            ratingUser2: 4.5,
            textReview: "Série top",
            genres: ["Sci-Fi"],
            recommendedById: USER_1.id,
            mediaType: "tv",
            seasonNumber: 1,
            totalEpisodes: 8,
            episodesWatched: 8,
            runtimePerEpisode: 45
        });

        // Series Season 2: Rec by Thácila, 10 eps @ 50m = 500 min
        const s2 = await addMovieReview({
            tmdbId: "tv-pair-2",
            title: "Series Thácila",
            posterPath: "/st.jpg",
            dateWatched: "2026-11-04",
            ratingUser1: 4.5,
            ratingUser2: 5.0,
            textReview: "Maravilhosa",
            genres: ["Drama"],
            recommendedById: USER_2.id,
            mediaType: "tv",
            seasonNumber: 1,
            totalEpisodes: 10,
            episodesWatched: 10,
            runtimePerEpisode: 50
        });

        const entries = [
            { review: m1 },
            { review: m2 },
            { review: s1 },
            { review: s2 }
        ];

        // 1. History Filter Verifications
        expect(filterHistory(entries, "all").length).toBe(4);
        expect(filterHistory(entries, "movies").length).toBe(2);
        expect(filterHistory(entries, "series").length).toBe(2);

        // 2. Profile Stats for William & Thácila
        const williamData = getProfileCardData(USER_1, entries as any);
        const thacilaData = getProfileCardData(USER_2, entries as any);

        expect(williamData.recommendedCount).toBe(2); // 1 movie + 1 series
        expect(thacilaData.recommendedCount).toBe(2); // 1 movie + 1 series

        // 3. Couple Joint Metrics
        const jointStats = getProfilesStats(entries as any);
        expect(jointStats.totalMovies).toBe(2);
        expect(jointStats.totalSeries).toBe(2);
        // Total minutes: 100 + 110 + 360 + 500 = 1070 minutes (17h 50m)
        expect(jointStats.totalMinutes).toBe(1070);
        expect(jointStats.totalFormattedTime).toBe("17h 50m");
    });
});
