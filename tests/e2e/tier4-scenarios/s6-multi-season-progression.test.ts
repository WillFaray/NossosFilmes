import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
    setupTestDb,
    teardownTestDb,
    resetTestDb,
    addToWatchlist,
    addSeriesProgress,
    addSeriesCheckin,
    completeSeriesProgress,
    getSeriesProgressList,
    getReviews,
    getTestPrisma,
    USER_1
} from "../harness";

describe("Tier 4 - Scenario 6: Multi-Season Sequential Progression with Watchlist Retention", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("T4-SCENARIO-06: Starting S1 while keeping series on watchlist, completing S1 and initiating S2", async () => {
        const prisma = getTestPrisma();

        // 1. Add "Succession" (TV Series, 4 seasons, 39 episodes) to Watchlist
        await addToWatchlist({
            tmdbId: "tv-succ",
            title: "Succession",
            mediaType: "tv",
            numberOfSeasons: 4,
            numberOfEpisodes: 39,
            addedById: USER_1.id
        });

        // 2. Start Season 1 with removeFromWatchlist: false (keep bookmark for future seasons)
        const s1 = await addSeriesProgress({
            tmdbId: "tv-succ",
            title: "Succession",
            seasonNumber: 1,
            seasonName: "1ª Temporada",
            totalEpisodes: 10,
            currentEpisode: 0,
            runtimePerEpisode: 60,
            removeFromWatchlist: false
        });

        // Verify Succession remains in Watchlist
        const wlItem = await prisma.watchlistItem.findUnique({
            where: { tmdbId: "tv-succ" }
        });
        expect(wlItem).not.toBeNull();
        expect(wlItem?.title).toBe("Succession");

        // 3. Complete Season 1 (10 episodes)
        await addSeriesCheckin({
            seriesProgressId: s1.id,
            dateWatched: "2026-11-10",
            episodeStart: 1,
            episodeEnd: 10
        });

        const s1Review = await completeSeriesProgress(s1.id, {
            ratingUser1: 5.0,
            ratingUser2: 5.0,
            textReview: "Primeira temporada espetacular!",
            watchedDates: ["2026-11-01", "2026-11-10"],
            recommendedById: USER_1.id
        });

        expect(s1Review.seasonNumber).toBe(1);
        expect(s1Review.seasonName).toBe("1ª Temporada");
        expect(s1Review.runtime).toBe(600); // 10 * 60 min

        // 4. Iniciar Season 2 (10 episodes)
        const s2 = await addSeriesProgress({
            tmdbId: "tv-succ",
            title: "Succession",
            seasonNumber: 2,
            seasonName: "2ª Temporada",
            totalEpisodes: 10,
            currentEpisode: 0,
            runtimePerEpisode: 60,
            removeFromWatchlist: false
        });

        expect(s2.seasonNumber).toBe(2);
        expect(s2.currentEpisode).toBe(0);

        // 5. Check-in Season 2 Ep 1
        const s2Checkin = await addSeriesCheckin({
            seriesProgressId: s2.id,
            dateWatched: "2026-11-15",
            episodeStart: 1,
            episodeEnd: 1
        });
        expect(s2Checkin.episodeTag).toBe("S02 • Ep 1");

        // 6. Full system verifications
        // Diary has S1 review
        const allReviews = await getReviews();
        expect(allReviews.some((r) => r.seasonNumber === 1 && r.title === "Succession")).toBe(true);

        // In-progress has S2 active
        const activeList = await getSeriesProgressList();
        expect(activeList.length).toBe(1);
        expect(activeList[0].seasonNumber).toBe(2);
        expect(activeList[0].currentEpisode).toBe(1);

        // Watchlist still retains Succession
        const finalWl = await prisma.watchlistItem.findUnique({
            where: { tmdbId: "tv-succ" }
        });
        expect(finalWl).not.toBeNull();
    });
});
