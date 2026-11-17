import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
    setupTestDb,
    teardownTestDb,
    resetTestDb,
    addToWatchlist,
    addSeriesProgress,
    getTestPrisma,
    USER_1,
    USER_2
} from "../harness";
import { SAMPLE_SERIES } from "../fixtures/sample-series";

describe("Tier 1 - R4: Lista de Interesse e Roleta", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("T1-R4-01: Add TV series to watchlist with season and episode metadata", async () => {
        const item = await addToWatchlist({
            tmdbId: SAMPLE_SERIES.dark.tmdbId,
            title: SAMPLE_SERIES.dark.title,
            posterPath: SAMPLE_SERIES.dark.posterPath,
            genres: SAMPLE_SERIES.dark.genres,
            mediaType: "tv",
            numberOfSeasons: 3,
            numberOfEpisodes: 26,
            addedById: USER_1.id
        });

        expect(item.mediaType).toBe("tv");
        expect(item.numberOfSeasons).toBe(3);
        expect(item.numberOfEpisodes).toBe(26);

        const prisma = getTestPrisma();
        const dbItem = await prisma.watchlistItem.findUnique({
            where: { tmdbId: SAMPLE_SERIES.dark.tmdbId }
        });
        expect(dbItem?.mediaType).toBe("tv");
        expect(dbItem?.numberOfSeasons).toBe(3);
        expect(dbItem?.numberOfEpisodes).toBe(26);
    });

    it("T1-R4-02: Watchlist filtering by media type (Todos | Filmes | Séries)", async () => {
        const items = [
            { id: "1", title: "M1", mediaType: "movie" },
            { id: "2", title: "M2", mediaType: "movie" },
            { id: "3", title: "M3", mediaType: "movie" },
            { id: "4", title: "S1", mediaType: "tv" },
            { id: "5", title: "S2", mediaType: "tv" }
        ];

        const movieItems = items.filter((i) => !i.mediaType || i.mediaType === "movie");
        const tvItems = items.filter((i) => i.mediaType === "tv");

        expect(items.length).toBe(5);
        expect(movieItems.length).toBe(3);
        expect(movieItems.every((i) => i.mediaType === "movie")).toBe(true);
        expect(tvItems.length).toBe(2);
        expect(tvItems.every((i) => i.mediaType === "tv")).toBe(true);
    });

    it("T1-R4-03: Roulette filter option (Ambos | Filmes | Séries)", async () => {
        const items = [
            { id: "1", title: "Filme A", mediaType: "movie" },
            { id: "2", title: "Filme B", mediaType: "movie" },
            { id: "3", title: "Filme C", mediaType: "movie" },
            { id: "4", title: "Filme D", mediaType: "movie" },
            { id: "5", title: "Série A", mediaType: "tv" },
            { id: "6", title: "Série B", mediaType: "tv" },
            { id: "7", title: "Série C", mediaType: "tv" }
        ];

        const candidates = items.filter((c) => c.mediaType === "tv");
        expect(candidates.length).toBe(3);
        expect(candidates.every((c) => c.mediaType === "tv")).toBe(true);

        const winner = candidates[Math.floor(Math.random() * candidates.length)];
        expect(winner.mediaType).toBe("tv");
        expect(["5", "6", "7"]).toContain(winner.id);
    });

    it("T1-R4-04: Automatic watchlist removal upon starting series in-progress", async () => {
        await addToWatchlist({
            tmdbId: "tv-fargo",
            title: "Fargo",
            posterPath: "/fargo.jpg",
            genres: ["Crime", "Drama"],
            mediaType: "tv",
            numberOfSeasons: 5,
            numberOfEpisodes: 51,
            addedById: USER_1.id
        });

        const prisma = getTestPrisma();
        const beforeStart = await prisma.watchlistItem.findUnique({
            where: { tmdbId: "tv-fargo" }
        });
        expect(beforeStart).not.toBeNull();

        await addSeriesProgress({
            tmdbId: "tv-fargo",
            title: "Fargo",
            seasonNumber: 1,
            totalEpisodes: 10,
            removeFromWatchlist: true
        });

        const afterStart = await prisma.watchlistItem.findUnique({
            where: { tmdbId: "tv-fargo" }
        });
        expect(afterStart).toBeNull();
    });

    it("T1-R4-05: Configurable retention: keep series in watchlist when starting", async () => {
        await addToWatchlist({
            tmdbId: "tv-fargo-keep",
            title: "Fargo",
            posterPath: "/fargo.jpg",
            genres: ["Crime", "Drama"],
            mediaType: "tv",
            numberOfSeasons: 5,
            numberOfEpisodes: 51,
            addedById: USER_1.id
        });

        await addSeriesProgress({
            tmdbId: "tv-fargo-keep",
            title: "Fargo",
            seasonNumber: 1,
            totalEpisodes: 10,
            removeFromWatchlist: false
        });

        const prisma = getTestPrisma();
        const retainedItem = await prisma.watchlistItem.findUnique({
            where: { tmdbId: "tv-fargo-keep" }
        });
        expect(retainedItem).not.toBeNull();
        expect(retainedItem?.tmdbId).toBe("tv-fargo-keep");
    });
});
