import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
    setupTestDb,
    teardownTestDb,
    resetTestDb,
    addMovieReview,
    exportData,
    importData,
    calculateTotalWatchTime,
    getReviews,
    USER_1,
    USER_2
} from "../harness";

describe("Tier 3 - Pairwise 6: Full Backup Round-Trip & Watch Time Parity (R5 × R6)", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("T3-PAIR-06: Mathematical round-trip preservation of calculated total watch time via JSON backup", async () => {
        // 1. Populate database:
        // 5 movies: 120 + 110 + 100 + 130 + 120 = 580 min
        const movieRuntimes = [120, 110, 100, 130, 120];
        for (let i = 0; i < movieRuntimes.length; i++) {
            await addMovieReview({
                tmdbId: `m-rt-${i}`,
                title: `Movie RT ${i}`,
                posterPath: `/p.jpg`,
                dateWatched: `2026-11-0${i + 1}`,
                ratingUser1: 4.0,
                ratingUser2: 4.0,
                textReview: "Movie review",
                genres: ["Ação"],
                recommendedById: USER_1.id,
                runtime: movieRuntimes[i],
                mediaType: "movie"
            });
        }

        // Season A: 10 eps * 50 min = 500 min
        await addMovieReview({
            tmdbId: "tv-rt-a",
            title: "Series A",
            posterPath: "/sa.jpg",
            dateWatched: "2026-11-06",
            ratingUser1: 5.0,
            ratingUser2: 5.0,
            textReview: "Temporada A",
            genres: ["Drama"],
            recommendedById: USER_1.id,
            mediaType: "tv",
            seasonNumber: 1,
            totalEpisodes: 10,
            episodesWatched: 10,
            runtimePerEpisode: 50
        });

        // Season B: 6 eps * 45 min = 270 min
        await addMovieReview({
            tmdbId: "tv-rt-b",
            title: "Series B",
            posterPath: "/sb.jpg",
            dateWatched: "2026-11-07",
            ratingUser1: 4.5,
            ratingUser2: 4.5,
            textReview: "Temporada B",
            genres: ["Comédia"],
            recommendedById: USER_2.id,
            mediaType: "tv",
            seasonNumber: 1,
            totalEpisodes: 6,
            episodesWatched: 6,
            runtimePerEpisode: 45
        });

        // 1 Abandoned Series: 3 eps * 60 min = 180 min
        await addMovieReview({
            tmdbId: "tv-rt-aban",
            title: "Series Abandoned",
            posterPath: "/saban.jpg",
            dateWatched: "2026-11-08",
            ratingUser1: 2.0,
            ratingUser2: 2.0,
            textReview: "Desistimos",
            genres: ["Suspense"],
            recommendedById: USER_1.id,
            mediaType: "tv",
            status: "abandoned",
            abandonedReason: "Ficou chata",
            totalEpisodes: 10,
            episodesWatched: 3,
            runtimePerEpisode: 60
        });

        // 2. Pre-export total minutes: 580 + 500 + 270 + 180 = 1530 min (25h 30m)
        const preReviews = await getReviews();
        expect(preReviews.length).toBe(8);
        const preStats = calculateTotalWatchTime(preReviews.map((r) => ({ review: r })));
        expect(preStats.totalMinutes).toBe(1530);
        expect(preStats.formattedTime).toBe("25h 30m");

        // 3. Export JSON backup
        const backupJson = await exportData();
        expect(backupJson.reviews.length).toBe(8);

        // 4. Wipe database
        await resetTestDb({ keepBaseUsers: true });
        const emptyReviews = await getReviews();
        expect(emptyReviews.length).toBe(0);
        const emptyStats = calculateTotalWatchTime([]);
        expect(emptyStats.totalMinutes).toBe(0);

        // 5. Restore backup
        await importData(backupJson);

        // 6. Post-restore verification
        const postReviews = await getReviews();
        expect(postReviews.length).toBe(8);
        const postStats = calculateTotalWatchTime(postReviews.map((r) => ({ review: r })));
        expect(postStats.totalMinutes).toBe(1530);
        expect(postStats.formattedTime).toBe("25h 30m");
    });
});
