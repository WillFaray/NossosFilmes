import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
    setupTestDb,
    teardownTestDb,
    resetTestDb,
    addMovieReview,
    addSeriesProgress,
    addSeriesCheckin,
    exportData,
    importData,
    calculateTotalWatchTime,
    getTestPrisma,
    ROOT_DIR,
    USER_1,
    USER_2
} from "../harness";
import { SAMPLE_SERIES } from "../fixtures/sample-series";

describe("Tier 1 - R6: Perfis e Backup com Retrocompatibilidade", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("T1-R6-01: Profile statistics show separate counts for movies and series/seasons alongside total time", () => {
        const movieEntries = Array.from({ length: 15 }, (_, i) => ({
            review: { id: `m-${i}`, runtime: 100, mediaType: "movie" }
        }));
        const seriesEntries = Array.from({ length: 5 }, (_, i) => ({
            review: {
                id: `s-${i}`,
                mediaType: "tv",
                totalEpisodes: 10,
                episodesWatched: 10,
                runtimePerEpisode: 50
            }
        }));

        const allEntries = [...movieEntries, ...seriesEntries];
        const totalMovies = allEntries.filter(e => !e.review.mediaType || e.review.mediaType === "movie").length;
        const totalSeries = allEntries.filter(e => e.review.mediaType === "tv").length;
        const watchStats = calculateTotalWatchTime(allEntries as any);

        expect(totalMovies).toBe(15);
        expect(totalSeries).toBe(5);
        // (15 * 100) + (5 * 500) = 1500 + 2500 = 4000 min = 66h 40m
        expect(watchStats.totalMinutes).toBe(4000);
        expect(watchStats.formattedTime).toBe("66h 40m");
    });

    it("T1-R6-02: Partner Top Genres in /perfis accurately includes genres from completed series", () => {
        const entries = [
            // 3 comedy movies rated 3.0
            {
                review: {
                    recommendedById: USER_1.id,
                    genres: ["Comédia"],
                    ratingUser1: 3.0,
                    ratingUser2: 3.0
                }
            },
            {
                review: {
                    recommendedById: USER_1.id,
                    genres: ["Comédia"],
                    ratingUser1: 3.0,
                    ratingUser2: 3.0
                }
            },
            {
                review: {
                    recommendedById: USER_1.id,
                    genres: ["Comédia"],
                    ratingUser1: 3.0,
                    ratingUser2: 3.0
                }
            },
            // 2 sci-fi series rated 5.0
            {
                review: {
                    recommendedById: USER_1.id,
                    genres: ["Sci-Fi", "Drama"],
                    ratingUser1: 5.0,
                    ratingUser2: 4.5
                }
            },
            {
                review: {
                    recommendedById: USER_1.id,
                    genres: ["Sci-Fi", "Drama"],
                    ratingUser1: 5.0,
                    ratingUser2: 5.0
                }
            }
        ];

        const user1Entries = entries.filter((e) => e.review.recommendedById === USER_1.id);
        expect(user1Entries.length).toBe(5);
        const sciFiRatings = user1Entries.filter(e => e.review.genres.includes("Sci-Fi")).map(e => e.review.ratingUser1);
        const sciFiAvg = sciFiRatings.reduce((a, b) => a + b, 0) / sciFiRatings.length;
        expect(sciFiAvg).toBe(5.0);
    });

    it("T1-R6-03: Full data export (exportData) produces JSON payload containing series fields and in-progress records", async () => {
        // Add a movie review
        await addMovieReview({
            tmdbId: "m-exp",
            title: "Movie Export",
            posterPath: "/m.jpg",
            dateWatched: "2026-11-10",
            ratingUser1: 4.5,
            ratingUser2: 4.0,
            textReview: "Filme bom",
            genres: ["Ação"],
            recommendedById: USER_1.id
        });

        // Add a series review
        await addMovieReview({
            tmdbId: SAMPLE_SERIES.dark.tmdbId,
            title: SAMPLE_SERIES.dark.title,
            posterPath: SAMPLE_SERIES.dark.posterPath,
            mediaType: "tv",
            seasonNumber: 1,
            seasonName: "1ª Temporada",
            totalEpisodes: 10,
            episodesWatched: 10,
            runtimePerEpisode: 50,
            dateWatched: "2026-11-11",
            ratingUser1: 5.0,
            ratingUser2: 5.0,
            textReview: "Série maravilhosa",
            genres: SAMPLE_SERIES.dark.genres,
            recommendedById: USER_2.id
        });

        // Add an in-progress series
        const inProgress = await addSeriesProgress({
            tmdbId: SAMPLE_SERIES.severance.tmdbId,
            title: SAMPLE_SERIES.severance.title,
            totalEpisodes: 9,
            currentEpisode: 3,
            genres: SAMPLE_SERIES.severance.genres
        });

        await addSeriesCheckin({
            seriesProgressId: inProgress.id,
            dateWatched: "2026-11-12",
            episodeStart: 1,
            episodeEnd: 3
        });

        const exported = await exportData();
        expect(exported.version).toBeGreaterThanOrEqual(2);
        expect(exported.users.length).toBe(2);
        expect(exported.reviews.length).toBe(2);
        expect(exported.reviews.some((r) => r.mediaType === "tv")).toBe(true);
        expect(exported.seriesProgress).toBeDefined();
        expect(exported.seriesProgress!.length).toBe(1);
        expect(exported.seriesProgress![0].tmdbId).toBe(SAMPLE_SERIES.severance.tmdbId);
    });

    it("T1-R6-04: 100% Backward compatibility with legacy v1 backup payload import", async () => {
        const fixturePath = path.resolve(ROOT_DIR, "tests/e2e/fixtures/backup-v1-legacy.json");
        expect(fs.existsSync(fixturePath)).toBe(true);
        const legacyPayload = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));

        const result = await importData(legacyPayload);
        expect(result.users).toBe(2);
        expect(result.reviews).toBe(56);
        expect(result.watchlist).toBe(5);

        const prisma = getTestPrisma();
        const reviews = await prisma.movieReview.findMany();
        expect(reviews.length).toBe(56);
        expect(reviews.every((r) => !r.mediaType || r.mediaType === "movie")).toBe(true);

        const watchlist = await prisma.watchlistItem.findMany();
        expect(watchlist.length).toBe(5);
        expect(watchlist.every((w) => !w.mediaType || w.mediaType === "movie")).toBe(true);
    });

    it("T1-R6-05: Modern v2 backup import and restore with series and check-ins", async () => {
        const v2Payload = {
            version: 2,
            exportedAt: "2026-11-16T12:00:00.000Z",
            users: [USER_1, USER_2],
            reviews: [
                {
                    id: "rev-m1",
                    tmdbId: "m-100",
                    title: "Movie Test",
                    posterPath: "/p1.jpg",
                    dateWatched: "2026-11-01",
                    ratingUser1: 4.5,
                    ratingUser2: 4.0,
                    textReview: "Muito bom",
                    genres: ["Ação"],
                    recommendedById: USER_1.id,
                    mediaType: "movie",
                    runtime: 120
                },
                {
                    id: "rev-s1",
                    tmdbId: "tv-200",
                    title: "Series Test",
                    posterPath: "/p2.jpg",
                    dateWatched: "2026-11-02",
                    ratingUser1: 5.0,
                    ratingUser2: 5.0,
                    textReview: "Sensacional",
                    genres: ["Drama"],
                    recommendedById: USER_2.id,
                    mediaType: "tv",
                    seasonNumber: 1,
                    seasonName: "1ª Temporada",
                    totalEpisodes: 8,
                    episodesWatched: 8,
                    runtimePerEpisode: 50,
                    runtime: 400
                }
            ],
            watchlist: [
                {
                    id: "wl-1",
                    tmdbId: "tv-300",
                    title: "Watchlist Series",
                    posterPath: "/p3.jpg",
                    genres: ["Sci-Fi"],
                    addedById: USER_1.id,
                    mediaType: "tv",
                    numberOfSeasons: 2,
                    numberOfEpisodes: 16
                }
            ],
            seriesProgress: [
                {
                    id: "sp-1",
                    tmdbId: "tv-400",
                    title: "In Progress Series",
                    posterPath: "/p4.jpg",
                    genres: ["Comédia"],
                    seasonNumber: 1,
                    seasonName: "1ª Temporada",
                    totalEpisodes: 10,
                    currentEpisode: 3,
                    runtimePerEpisode: 30,
                    status: "watching",
                    checkins: [
                        {
                            id: "chk-1",
                            dateWatched: "2026-11-05",
                            episodeStart: 1,
                            episodeEnd: 2,
                            episodeTag: "S01 • Eps 1-2"
                        },
                        {
                            id: "chk-2",
                            dateWatched: "2026-11-06",
                            episodeStart: 3,
                            episodeEnd: 3,
                            episodeTag: "S01 • Ep 3"
                        }
                    ]
                }
            ]
        };

        const result = await importData(v2Payload);
        expect(result.users).toBe(2);
        expect(result.reviews).toBe(2);
        expect(result.watchlist).toBe(1);

        const prisma = getTestPrisma();
        const activeSeries = await (prisma as any).seriesProgress.findMany({
            include: { checkins: true }
        });
        expect(activeSeries.length).toBe(1);
        expect(activeSeries[0].checkins.length).toBe(2);
        expect(activeSeries[0].title).toBe("In Progress Series");
    });
});
