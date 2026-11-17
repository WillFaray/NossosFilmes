import { describe, it, expect } from "bun:test";
import {
    calculateTotalWatchTime,
    getEntryDurationMinutes,
    computeYearSummary
} from "@/lib/runtime";

describe("Tier 1 - R5: Tempo Total Assistido", () => {
    it("T1-R5-01: Unified watch time calculation integrating movies and TV series episodes", () => {
        // 1 movie of 120 min + 1 series of 10 episodes * 45 min = 450 min -> 570 min = 9h 30m
        const movieEntry = {
            review: { runtime: 120, mediaType: "movie" }
        };
        const seriesEntry = {
            review: {
                mediaType: "tv",
                totalEpisodes: 10,
                episodesWatched: 10,
                runtimePerEpisode: 45
            }
        };

        const stats = calculateTotalWatchTime([movieEntry, seriesEntry]);
        expect(stats.totalMinutes).toBe(570);
        expect(stats.formattedTime).toBe("9h 30m");
    });

    it("T1-R5-02: Fallback duration calculation when TMDB episode runtime is missing or 0", () => {
        const result = getEntryDurationMinutes({
            movie: { mediaType: "tv" },
            review: {
                mediaType: "tv",
                episodesWatched: 8,
                runtimePerEpisode: null
            }
        });

        // 8 * 45 = 360 min
        expect(result.minutes).toBe(360);
        expect(result.isEstimated).toBe(true);
    });

    it("T1-R5-03: Custom user-edited episode runtime takes precedence", () => {
        const result = getEntryDurationMinutes({
            movie: { mediaType: "tv" },
            review: {
                mediaType: "tv",
                episodesWatched: 6,
                runtimePerEpisode: 60
            }
        });

        // 6 * 60 = 360 min, not estimated
        expect(result.minutes).toBe(360);
        expect(result.isEstimated).toBe(false);
    });

    it("T1-R5-04: Partial watch time accounting for abandoned series", () => {
        // Abandoned at episode 4 of 10 with 50 min/ep -> exactly 4 * 50 = 200 min
        const result = getEntryDurationMinutes({
            movie: { mediaType: "tv" },
            review: {
                mediaType: "tv",
                status: "abandoned",
                totalEpisodes: 10,
                episodesWatched: 4,
                runtimePerEpisode: 50
            }
        });

        expect(result.minutes).toBe(200);
        expect(result.isEstimated).toBe(false);
    });

    it("T1-R5-05: Annual Retrospective incorporates series minutes accurately", () => {
        // Year 2026: 2 movies (100 min + 110 min = 210 min) + 1 series (10 eps * 45 min = 450 min)
        // Total = 660 min = 11h
        const entries2026 = [
            { review: { dateWatched: "2026-02-10", runtime: 100, mediaType: "movie" } },
            { review: { dateWatched: "2026-05-15", runtime: 110, mediaType: "movie" } },
            {
                review: {
                    dateWatched: "2026-11-01",
                    mediaType: "tv",
                    totalEpisodes: 10,
                    episodesWatched: 10,
                    runtimePerEpisode: 45
                }
            },
            { review: { dateWatched: "2025-12-30", runtime: 120, mediaType: "movie" } }
        ];

        const summary = computeYearSummary(entries2026 as any, "2026");
        expect(summary).not.toBeNull();
        expect(summary?.count).toBe(3);
        expect(summary?.totalMinutes).toBe(660);
        expect(summary?.formattedTime).toBe("11h");
    });

    it("T1-R5-06: Movie fallback duration calculation defaults to 110 minutes", () => {
        const emptyResult = getEntryDurationMinutes();
        expect(emptyResult.minutes).toBe(110);
        expect(emptyResult.isEstimated).toBe(true);

        const nullMovieResult = getEntryDurationMinutes({
            movie: { mediaType: "movie", runtime: null },
            review: { mediaType: "movie", runtime: null }
        });
        expect(nullMovieResult.minutes).toBe(110);
        expect(nullMovieResult.isEstimated).toBe(true);
    });
});
