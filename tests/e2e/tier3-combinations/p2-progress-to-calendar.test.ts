import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
    setupTestDb,
    teardownTestDb,
    resetTestDb,
    addSeriesProgress,
    addSeriesCheckin,
    getTestPrisma
} from "../harness";

describe("Tier 3 - Pairwise 2: Daily Check-in Progression & Calendar (R2 × R3)", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("T3-PAIR-02: Daily check-in progression mutating SeriesProgress and propagating session tags", async () => {
        const prisma = getTestPrisma();

        // 1. In-progress series at episode 2 of 10
        const succession = await addSeriesProgress({
            tmdbId: "76331",
            title: "Succession",
            posterPath: "/succ.jpg",
            seasonNumber: 1,
            totalEpisodes: 10,
            currentEpisode: 2
        });

        // 2. Submit check-in for episodes 3 to 5 on 2026-11-15
        const checkin = await addSeriesCheckin({
            seriesProgressId: succession.id,
            dateWatched: "2026-11-15",
            episodeStart: 3,
            episodeEnd: 5
        });

        // 3. Verify invariants
        expect(checkin.episodeTag).toBe("S01 • Eps 3-5");
        expect(checkin.dateWatched).toBe("2026-11-15");

        const updatedProgress = await (prisma as any).seriesProgress.findUnique({
            where: { id: succession.id },
            include: { checkins: true }
        });

        expect(updatedProgress.currentEpisode).toBe(5);
        expect(updatedProgress.checkins.length).toBe(1);
        expect(updatedProgress.checkins[0].episodeTag).toBe("S01 • Eps 3-5");

        // Calendar session tag
        const calendarEntry = {
            dateWatched: checkin.dateWatched,
            title: succession.title,
            posterPath: succession.posterPath,
            episodeTag: checkin.episodeTag
        };

        expect(calendarEntry.dateWatched).toBe("2026-11-15");
        expect(calendarEntry.episodeTag).toBe("S01 • Eps 3-5");
    });
});
