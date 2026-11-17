import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
    setupTestDb,
    teardownTestDb,
    resetTestDb,
    addMovieReview,
    importData,
    mergeData,
    calculateHeadToHeadStats,
    getTestPrisma,
    USER_1,
    USER_2
} from "../harness";

describe("Tier 2 - R6: Perfis e Backup com Retrocompatibilidade Boundaries", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("T2-R6-01: Corrupt / Malformed JSON import payload is rejected without modifying database", async () => {
        await expect(importData({ foo: "bar" } as any)).rejects.toThrow(/formato inválido/i);
        await expect(importData("not-an-object" as any)).rejects.toThrow(/formato inválido/i);

        // Database users remain intact
        const prisma = getTestPrisma();
        const users = await prisma.user.findMany();
        expect(users.length).toBe(2);
    });

    it("T2-R6-02: Payload size threshold boundary (> 10 MB payload) is rejected", async () => {
        // Construct large mock string exceeding 10MB
        const giantString = "X".repeat(11 * 1024 * 1024);
        const oversizedPayload = {
            version: 1,
            users: [USER_1, USER_2],
            reviews: [],
            watchlist: [],
            padding: giantString
        };

        await expect(importData(oversizedPayload as any)).rejects.toThrow(/excede o limite/i);
    });

    it("T2-R6-03: Legacy backup with partial undefined movie review fields imports gracefully", async () => {
        const legacyPartialItem = {
            id: "leg-part-1",
            tmdbId: "m-part-1",
            title: "Old Movie With Missing Fields",
            posterPath: "/p.jpg",
            dateWatched: "2026-01-01",
            ratingUser1: 4.0,
            ratingUser2: 4.0,
            textReview: "Legal",
            genres: ["Ação"],
            recommendedById: USER_1.id
            // platform, runtime, overview, releaseDate missing
        };

        await importData({
            version: 1,
            users: [USER_1, USER_2],
            reviews: [legacyPartialItem],
            watchlist: []
        });

        const prisma = getTestPrisma();
        const saved = await prisma.movieReview.findUnique({
            where: { id: "leg-part-1" }
        });

        expect(saved).not.toBeNull();
        expect(saved?.mediaType).toBe("movie");
        expect(saved?.runtime).toBeNull();
        expect(saved?.platform).toBeNull();
    });

    it("T2-R6-04: Merge data deduplication for series reviews (tmdbId_dateWatched key)", async () => {
        // Create initial series review
        await addMovieReview({
            tmdbId: "tv-merge-dup",
            title: "Merge Dup Series",
            posterPath: "/m.jpg",
            dateWatched: "2026-11-10",
            ratingUser1: 4.5,
            ratingUser2: 4.5,
            textReview: "Já existia",
            genres: ["Drama"],
            recommendedById: USER_1.id,
            mediaType: "tv",
            seasonNumber: 1
        });

        const existingReview = {
            id: "merge-rev-1",
            tmdbId: "tv-merge-dup",
            title: "Merge Dup Series",
            posterPath: "/m.jpg",
            dateWatched: "2026-11-10",
            ratingUser1: 4.5,
            ratingUser2: 4.5,
            textReview: "Já existia",
            genres: ["Drama"],
            recommendedById: USER_1.id,
            mediaType: "tv"
        };

        const newReview = {
            id: "merge-rev-2",
            tmdbId: "tv-merge-new",
            title: "New Merged Show",
            posterPath: "/new.jpg",
            dateWatched: "2026-11-12",
            ratingUser1: 5.0,
            ratingUser2: 5.0,
            textReview: "Novo!",
            genres: ["Sci-Fi"],
            recommendedById: USER_2.id,
            mediaType: "tv"
        };

        const res = await mergeData({
            version: 2,
            users: [USER_1, USER_2],
            reviews: [existingReview, newReview],
            watchlist: []
        });

        // Exactly 1 new review added (duplicate discarded)
        expect(res.addedReviews).toBe(1);

        const prisma = getTestPrisma();
        const allReviews = await prisma.movieReview.findMany({
            where: { tmdbId: { in: ["tv-merge-dup", "tv-merge-new"] } }
        });
        expect(allReviews.length).toBe(2);
    });

    it("T2-R6-05: Couple affinity calculation with 0 reviews vs 100% agreement on series", () => {
        // Case A: 0 reviews in database -> null without division by zero
        expect(calculateHeadToHeadStats([])).toBeNull();

        // Case B: 5 series reviews with identical ratings -> 100% affinity
        const identicalSeriesEntries = Array.from({ length: 5 }, (_, i) => ({
            review: {
                ratingUser1: 5.0,
                ratingUser2: 5.0
            }
        }));

        const stats100 = calculateHeadToHeadStats(identicalSeriesEntries);
        expect(stats100).not.toBeNull();
        expect(stats100?.affinityPercentage).toBe(100);
        expect(stats100?.totalCompared).toBe(5);
    });
});
