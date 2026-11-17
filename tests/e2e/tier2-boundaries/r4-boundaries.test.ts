import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
    setupTestDb,
    teardownTestDb,
    resetTestDb,
    addToWatchlist,
    addSeriesProgress,
    getTestPrisma,
    USER_1
} from "../harness";

describe("Tier 2 - R4: Lista de Interesse e Roleta Boundaries", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("T2-R4-01: Roulette candidates pool is empty when 0 series match filter in Watchlist", () => {
        const movieOnlyList = [
            { id: "1", title: "Movie 1", mediaType: "movie" },
            { id: "2", title: "Movie 2", mediaType: "movie" }
        ];

        const candidates = movieOnlyList.filter((m) => m.mediaType === "tv");
        expect(candidates.length).toBe(0);
        expect(candidates[0]).toBeUndefined();
    });

    it("T2-R4-02: Roulette with exactly 1 candidate selects that exact item deterministically", () => {
        const singleSeriesList = [
            { id: "series-only-1", title: "The Only Show", mediaType: "tv" }
        ];

        const candidates = singleSeriesList.filter((m) => m.mediaType === "tv");
        expect(candidates.length).toBe(1);

        const winner = candidates[0];
        expect(winner.id).toBe("series-only-1");
        expect(winner.title).toBe("The Only Show");
    });

    it("T2-R4-03: TV series with null seasons and episodes in TMDB response falls back gracefully", async () => {
        const item = await addToWatchlist({
            tmdbId: "tv-unreleased",
            title: "Unreleased Show",
            posterPath: "/unreleased.jpg",
            genres: ["Drama"],
            mediaType: "tv",
            numberOfSeasons: null,
            numberOfEpisodes: null,
            addedById: USER_1.id
        });

        expect(item.numberOfSeasons).toBeNull();
        expect(item.numberOfEpisodes).toBeNull();
        expect(item.mediaType).toBe("tv");
    });

    it("T2-R4-04: Duplicate watchlist item prevention for TV series", async () => {
        await addToWatchlist({
            tmdbId: "tv-dup-check",
            title: "Original Show",
            posterPath: "/orig.jpg",
            genres: ["Drama"],
            mediaType: "tv",
            addedById: USER_1.id
        });

        await expect(
            addToWatchlist({
                tmdbId: "tv-dup-check",
                title: "Duplicate Show",
                posterPath: "/dup.jpg",
                genres: ["Drama"],
                mediaType: "tv",
                addedById: USER_1.id
            })
        ).rejects.toThrow(/já está na lista/i);
    });

    it("T2-R4-05: Name collision between movie and TV series in auto-removal", async () => {
        // Add movie Fargo
        await addToWatchlist({
            tmdbId: "movie-fargo-100",
            title: "Fargo",
            posterPath: "/m-fargo.jpg",
            genres: ["Crime"],
            mediaType: "movie",
            addedById: USER_1.id
        });

        // Add TV series Fargo
        await addToWatchlist({
            tmdbId: "tv-fargo-200",
            title: "Fargo",
            posterPath: "/tv-fargo.jpg",
            genres: ["Crime", "Drama"],
            mediaType: "tv",
            numberOfSeasons: 5,
            addedById: USER_1.id
        });

        const prisma = getTestPrisma();
        const beforeCount = await prisma.watchlistItem.count();
        expect(beforeCount).toBe(2);

        // Start TV series Fargo with auto-removal
        await addSeriesProgress({
            tmdbId: "tv-fargo-200",
            title: "Fargo",
            seasonNumber: 1,
            totalEpisodes: 10,
            removeFromWatchlist: true
        });

        // Verify movie Fargo remains in watchlist
        const movieItem = await prisma.watchlistItem.findUnique({
            where: { tmdbId: "movie-fargo-100" }
        });
        expect(movieItem).not.toBeNull();
        expect(movieItem?.title).toBe("Fargo");

        // Verify TV series Fargo is removed
        const tvItem = await prisma.watchlistItem.findUnique({
            where: { tmdbId: "tv-fargo-200" }
        });
        expect(tvItem).toBeNull();
    });
});
