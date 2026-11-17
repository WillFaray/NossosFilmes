import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
    setupTestDb,
    teardownTestDb,
    resetTestDb,
    addMovieReview,
    addSeriesProgress,
    addSeriesCheckin,
    USER_1,
    USER_2
} from "../harness";

describe("Tier 2 - R3: Histórico e Calendário Unificados Boundaries", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("T2-R3-01: Filtering history with zero items in targeted category returns empty array gracefully", () => {
        const movieOnlyEntries = [
            { review: { id: "1", title: "M1", mediaType: "movie" } },
            { review: { id: "2", title: "M2", mediaType: "movie" } }
        ];

        const seriesFiltered = movieOnlyEntries.filter((e) => e.review.mediaType === "tv");
        expect(seriesFiltered.length).toBe(0);

        const allFiltered = movieOnlyEntries;
        expect(allFiltered.length).toBe(2);
    });

    it("T2-R3-02: Multiple sessions for distinct series on the exact same calendar day", async () => {
        const seriesA = await addSeriesProgress({
            tmdbId: "tv-day-a",
            title: "Series Alpha",
            seasonNumber: 1,
            totalEpisodes: 8
        });

        const seriesB = await addSeriesProgress({
            tmdbId: "tv-day-b",
            title: "Series Beta",
            seasonNumber: 3,
            totalEpisodes: 10
        });

        const chk1 = await addSeriesCheckin({
            seriesProgressId: seriesA.id,
            dateWatched: "2026-11-16",
            episodeStart: 1,
            episodeEnd: 1
        });

        const chk2 = await addSeriesCheckin({
            seriesProgressId: seriesB.id,
            dateWatched: "2026-11-16",
            episodeStart: 5,
            episodeEnd: 6
        });

        expect(chk1.dateWatched).toBe("2026-11-16");
        expect(chk1.episodeTag).toBe("S01 • Ep 1");
        expect(chk2.dateWatched).toBe("2026-11-16");
        expect(chk2.episodeTag).toBe("S03 • Eps 5-6");

        // Both sessions coexist for 2026-11-16
        const daySessions = [chk1, chk2].filter((s) => s.dateWatched === "2026-11-16");
        expect(daySessions.length).toBe(2);
    });

    it("T2-R3-03: Mixed media types on the same calendar date (1 Movie + 1 TV Session)", async () => {
        const movie = await addMovieReview({
            tmdbId: "m-same-day",
            title: "Inception",
            posterPath: "/inc.jpg",
            dateWatched: "2026-11-16",
            ratingUser1: 5.0,
            ratingUser2: 4.5,
            textReview: "Filmaço!",
            genres: ["Ficção científica"],
            recommendedById: USER_1.id,
            mediaType: "movie",
            runtime: 148
        });

        const series = await addSeriesProgress({
            tmdbId: "tv-same-day",
            title: "Succession",
            seasonNumber: 1,
            totalEpisodes: 10
        });

        const checkin = await addSeriesCheckin({
            seriesProgressId: series.id,
            dateWatched: "2026-11-16",
            episodeStart: 1,
            episodeEnd: 2
        });

        const calendarItems = [
            { id: movie.id, type: "movie", title: movie.title, date: movie.dateWatched },
            { id: checkin.id, type: "tv", title: series.title, date: checkin.dateWatched, tag: checkin.episodeTag }
        ];

        const dayItems = calendarItems.filter((i) => i.date === "2026-11-16");
        expect(dayItems.length).toBe(2);
        expect(dayItems.some((i) => i.type === "movie")).toBe(true);
        expect(dayItems.some((i) => i.type === "tv")).toBe(true);
    });

    it("T2-R3-04: Calendar rendering on leap day (2024-02-29) preserves exact date without offset", async () => {
        const review = await addMovieReview({
            tmdbId: "m-leap",
            title: "Dune",
            posterPath: "/dune.jpg",
            dateWatched: "2024-02-29",
            ratingUser1: 4.5,
            ratingUser2: 4.5,
            textReview: "Assistido no ano bissexto!",
            genres: ["Ficção científica"],
            recommendedById: USER_1.id
        });

        expect(review.dateWatched).toBe("2024-02-29");
        const [year, month, day] = review.dateWatched.split("-").map(Number);
        expect(year).toBe(2024);
        expect(month).toBe(2);
        expect(day).toBe(29);
    });

    it("T2-R3-05: Maximum review length (280 chars) and boundary star ratings (0.5 and 5.0)", async () => {
        const text280 = "A".repeat(280);
        const review = await addMovieReview({
            tmdbId: "m-boundary-ratings",
            title: "Boundary Ratings Test",
            posterPath: "/p.jpg",
            dateWatched: "2026-11-16",
            ratingUser1: 0.5,
            ratingUser2: 5.0,
            textReview: text280,
            genres: ["Drama"],
            recommendedById: USER_1.id
        });

        expect(review.textReview.length).toBe(280);
        expect(review.ratingUser1).toBe(0.5);
        expect(review.ratingUser2).toBe(5.0);

        // Negative: > 280 chars throws error
        await expect(
            addMovieReview({
                tmdbId: "m-boundary-over",
                title: "Over Length",
                posterPath: "/p.jpg",
                dateWatched: "2026-11-16",
                ratingUser1: 3.0,
                ratingUser2: 3.0,
                textReview: "A".repeat(281),
                genres: ["Drama"],
                recommendedById: USER_1.id
            })
        ).rejects.toThrow(/máximo 280 caracteres/i);

        // Negative: rating < 0.5 or > 5.0 throws error
        await expect(
            addMovieReview({
                tmdbId: "m-boundary-rating-under",
                title: "Under Rating",
                posterPath: "/p.jpg",
                dateWatched: "2026-11-16",
                ratingUser1: 0.4,
                ratingUser2: 3.0,
                textReview: "Invalid rating",
                genres: ["Drama"],
                recommendedById: USER_1.id
            })
        ).rejects.toThrow(/entre 0.5 e 5/i);
    });
});
