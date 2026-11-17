import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
    setupTestDb,
    teardownTestDb,
    resetTestDb,
    addToWatchlist,
    addSeriesProgress,
    getSeriesProgressList,
    getTestPrisma,
    USER_1,
    USER_2
} from "../harness";

describe("Tier 3 - Pairwise 1: Watchlist to In-Progress Transition (R2 × R4)", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("T3-PAIR-01: Watchlist series conversion to in-progress with auto-removal vs keep toggle", async () => {
        const prisma = getTestPrisma();

        // 1. Add "Game of Thrones" to watchlist
        await addToWatchlist({
            tmdbId: "1399",
            title: "Game of Thrones",
            posterPath: "/poster_got.jpg",
            genres: ["Drama", "Sci-Fi & Fantasy"],
            mediaType: "tv",
            numberOfSeasons: 8,
            numberOfEpisodes: 73,
            runtime: 60,
            addedById: USER_1.id
        });

        const initialWl = await prisma.watchlistItem.count();
        expect(initialWl).toBe(1);

        const initialProgress = await getSeriesProgressList();
        expect(initialProgress.length).toBe(0);

        // 2. Start marathon with removeFromWatchlist: true
        await addSeriesProgress({
            tmdbId: "1399",
            title: "Game of Thrones",
            posterPath: "/poster_got.jpg",
            seasonNumber: 1,
            seasonName: "1ª Temporada",
            totalEpisodes: 10,
            runtimePerEpisode: 60,
            removeFromWatchlist: true
        });

        // 3. Verify auto-removal from Watchlist and creation in SeriesProgress
        const remainingWl = await prisma.watchlistItem.findUnique({
            where: { tmdbId: "1399" }
        });
        expect(remainingWl).toBeNull();

        const activeSeries = await (prisma as any).seriesProgress.findFirst({
            where: { tmdbId: "1399" }
        });
        expect(activeSeries).not.toBeNull();
        expect(activeSeries.status).toBe("watching");
        expect(activeSeries.seasonNumber).toBe(1);
        expect(activeSeries.totalEpisodes).toBe(10);
        expect(activeSeries.currentEpisode).toBe(0);
        expect(activeSeries.runtimePerEpisode).toBe(60);

        // 4. Contrast Sub-Check: Start another series with removeFromWatchlist: false
        await addToWatchlist({
            tmdbId: "2000",
            title: "Breaking Bad",
            mediaType: "tv",
            numberOfSeasons: 5,
            numberOfEpisodes: 62,
            addedById: USER_2.id
        });

        await addSeriesProgress({
            tmdbId: "2000",
            title: "Breaking Bad",
            seasonNumber: 1,
            totalEpisodes: 7,
            removeFromWatchlist: false
        });

        // Item remains in Watchlist AND appears in SeriesProgress
        const keptWl = await prisma.watchlistItem.findUnique({
            where: { tmdbId: "2000" }
        });
        expect(keptWl).not.toBeNull();

        const keptProgress = await (prisma as any).seriesProgress.findFirst({
            where: { tmdbId: "2000" }
        });
        expect(keptProgress).not.toBeNull();
    });
});
