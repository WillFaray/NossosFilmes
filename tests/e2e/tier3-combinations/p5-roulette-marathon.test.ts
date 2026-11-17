import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
    setupTestDb,
    teardownTestDb,
    resetTestDb,
    addToWatchlist,
    addSeriesProgress,
    getRouletteCandidates,
    spinRoulette,
    filterWatchlist,
    getTestPrisma,
    USER_1
} from "../harness";

describe("Tier 3 - Pairwise 5: Roulette Driving Series Marathon (R4 × R2)", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("T3-PAIR-05: Roulette decision wheel driving series marathon initiation", async () => {
        const prisma = getTestPrisma();

        // 1. Watchlist: 3 movies + 2 series
        await addToWatchlist({ tmdbId: "m-1", title: "Inception", mediaType: "movie", addedById: USER_1.id });
        await addToWatchlist({ tmdbId: "m-2", title: "Dune", mediaType: "movie", addedById: USER_1.id });
        await addToWatchlist({ tmdbId: "m-3", title: "Interstellar", mediaType: "movie", addedById: USER_1.id });
        await addToWatchlist({
            tmdbId: "tv-bear",
            title: "The Bear",
            mediaType: "tv",
            numberOfSeasons: 2,
            numberOfEpisodes: 18,
            runtime: 30,
            addedById: USER_1.id
        });
        await addToWatchlist({
            tmdbId: "tv-arcane",
            title: "Arcane",
            mediaType: "tv",
            numberOfSeasons: 2,
            numberOfEpisodes: 18,
            runtime: 40,
            addedById: USER_1.id
        });

        const allItems = await prisma.watchlistItem.findMany();
        expect(allItems.length).toBe(5);

        // 2. Filter roulette pool by "tv"
        const candidates = getRouletteCandidates(allItems as any, { mediaFilter: "tv" });
        expect(candidates.length).toBe(2);
        expect(candidates.every((c) => c.mediaType === "tv")).toBe(true);

        // 3. Spin roulette
        const winner = spinRoulette(candidates);
        expect(["tv-bear", "tv-arcane"]).toContain(winner.tmdbId);

        // 4. Iniciar Maratona Agora for winner with removeFromWatchlist: true
        await addSeriesProgress({
            tmdbId: winner.tmdbId,
            title: winner.title,
            seasonNumber: 1,
            totalEpisodes: 10,
            removeFromWatchlist: true
        });

        // 5. Verify winner removed from Watchlist and added to SeriesProgress
        const winnerInWatchlist = await prisma.watchlistItem.findUnique({
            where: { tmdbId: winner.tmdbId }
        });
        expect(winnerInWatchlist).toBeNull();

        const activeSeries = await (prisma as any).seriesProgress.findFirst({
            where: { tmdbId: winner.tmdbId }
        });
        expect(activeSeries).not.toBeNull();
        expect(activeSeries.status).toBe("watching");
        expect(activeSeries.currentEpisode).toBe(0);

        // Remaining TV items in watchlist is exactly 1
        const remainingWatchlist = await prisma.watchlistItem.findMany();
        const remainingTv = filterWatchlist(remainingWatchlist as any, "tv");
        expect(remainingTv.length).toBe(1);
    });
});
