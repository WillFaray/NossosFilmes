import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { setupTestDb, teardownTestDb, resetTestDb, USER_1 } from "../harness";
import {
    calculateTotalWatchTime,
    computeYearSummary,
    parseRuntimeInput
} from "@/lib/runtime";

describe("Direct Production Code Validation (lib/actions & lib/runtime)", () => {
    let actions: typeof import("@/lib/actions");

    beforeAll(async () => {
        await setupTestDb();
        actions = await import("@/lib/actions");
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("lib/actions: addSeriesCheckin enforces episodeEnd <= totalEpisodes", async () => {
        const series = await actions.addSeriesProgress({
            tmdbId: "tv-upper-bound-test",
            title: "Upper Bound Test Series",
            posterPath: "/poster.jpg",
            genres: ["Sci-Fi"],
            seasonNumber: 1,
            seasonName: "1ª Temporada",
            totalEpisodes: 10,
            runtimePerEpisode: 50
        });

        // Valid checkin succeeds
        const validCheckin = await actions.addSeriesCheckin({
            seriesProgressId: series.id,
            dateWatched: "2026-11-16",
            episodeStart: 1,
            episodeEnd: 5
        });
        expect(validCheckin.episodeEnd).toBe(5);

        // Invalid checkin with episodeEnd (15) > totalEpisodes (10) must throw
        await expect(
            actions.addSeriesCheckin({
                seriesProgressId: series.id,
                dateWatched: "2026-11-16",
                episodeStart: 6,
                episodeEnd: 15
            })
        ).rejects.toThrow("O episódio final excede o total de episódios da temporada.");
    });

    it("lib/actions: addMovieReview sorts watchedDates chronologically before persisting", async () => {
        const unsortedDates = ["2026-01-02", "2025-12-31", "2026-01-01"];
        const review = await actions.addMovieReview({
            tmdbId: "m-sort-dates",
            title: "Sorted Dates Movie",
            posterPath: "/poster.jpg",
            dateWatched: "2026-01-02",
            ratingUser1: 4.5,
            ratingUser2: 4.0,
            textReview: "Muito bom",
            genres: ["Drama"],
            recommendedById: USER_1.id,
            watchedDates: unsortedDates
        });

        expect(review.watchedDates).toBe(JSON.stringify(["2025-12-31", "2026-01-01", "2026-01-02"]));
    });

    it("lib/actions: updateMovieReview sorts watchedDates chronologically before persisting", async () => {
        const review = await actions.addMovieReview({
            tmdbId: "m-update-sort",
            title: "Update Sort Movie",
            posterPath: "/poster.jpg",
            dateWatched: "2026-01-01",
            ratingUser1: 4.0,
            ratingUser2: 4.0,
            textReview: "Inicial",
            genres: ["Ação"],
            recommendedById: USER_1.id,
            watchedDates: ["2026-01-01"]
        });

        const updated = await actions.updateMovieReview(review.id, {
            tmdbId: "m-update-sort",
            title: "Update Sort Movie",
            posterPath: "/poster.jpg",
            dateWatched: "2026-03-01",
            ratingUser1: 4.5,
            ratingUser2: 4.5,
            textReview: "Atualizado",
            genres: ["Ação"],
            recommendedById: USER_1.id,
            watchedDates: ["2026-03-01", "2026-02-15", "2026-02-01"]
        });

        expect(updated.watchedDates).toBe(JSON.stringify(["2026-02-01", "2026-02-15", "2026-03-01"]));
    });

    it("lib/runtime: calculateTotalWatchTime & computeYearSummary calculate statistics accurately", () => {
        const entries = [
            { review: { dateWatched: "2026-01-10", runtime: 90, mediaType: "movie" } },
            {
                review: {
                    dateWatched: "2026-02-20",
                    mediaType: "tv",
                    totalEpisodes: 8,
                    episodesWatched: 8,
                    runtimePerEpisode: 45
                }
            },
            { review: { dateWatched: "2025-12-25", runtime: 120, mediaType: "movie" } }
        ];

        const totalStats = calculateTotalWatchTime(entries);
        expect(totalStats.totalMinutes).toBe(570);
        expect(totalStats.formattedTime).toBe("9h 30m");

        const yearSummary2026 = computeYearSummary(entries, "2026");
        expect(yearSummary2026).not.toBeNull();
        expect(yearSummary2026?.count).toBe(2);
        expect(yearSummary2026?.totalMinutes).toBe(450);
        expect(yearSummary2026?.formattedTime).toBe("7h 30m");

        const fallbackParsed = parseRuntimeInput("invalid", 45);
        expect(fallbackParsed).toBe(45);
    });
});
