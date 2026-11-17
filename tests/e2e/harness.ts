import path from "node:path";
import fs from "node:fs";
import { mock } from "bun:test";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { BASE_USERS, USER_1, USER_2 } from "./fixtures/base-users";
import type {
    AddSeriesProgressInput,
    AddSeriesCheckinInput,
    AbandonSeriesInput,
    MovieReviewInput,
    DbSeriesProgress,
    DbSeriesCheckin,
    DbSeriesProgressWithCheckins,
    DbMovieReview,
    DbWatchlistItem,
    DbUser
} from "@/types";

// 1. Mock Next.js cache APIs to prevent static generation store invariant crashes
mock.module("next/cache", () => ({
    revalidatePath: () => {},
    revalidateTag: () => {}
}));

// 2. Constants & Paths
export const ROOT_DIR = process.cwd();
export const DEV_DB_PATH = path.resolve(ROOT_DIR, "dev.db");
export const TEST_DB_PATH = path.resolve(ROOT_DIR, "test.db");
export const TEST_DB_URL = `file:${TEST_DB_PATH}`;

export { BASE_USERS, USER_1, USER_2 };

let testPrismaClient: PrismaClient | null = null;

// 3. Safety Guard
export function assertSafeDatabaseUrl(): void {
    if (process.env.DATABASE_URL?.includes("dev.db") && !process.env.ALLOW_DEV_DB_READ) {
        throw new Error("CRITICAL SAFETY VIOLATION: Execution attempted against dev.db! Aborting.");
    }
}

// 4. Test DB Setup
export async function setupTestDb(options: { fromDevCopy?: boolean } = { fromDevCopy: true }): Promise<PrismaClient> {
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    process.env.DATABASE_URL = TEST_DB_URL;
    assertSafeDatabaseUrl();

    // Disconnect existing client if open
    if (testPrismaClient) {
        try {
            await testPrismaClient.$disconnect();
        } catch {}
        testPrismaClient = null;
    }

    // Clean up old test db files
    cleanupTestDbFiles();

    // Copy dev.db if requested and exists; else migrate
    if (options.fromDevCopy && fs.existsSync(DEV_DB_PATH)) {
        fs.copyFileSync(DEV_DB_PATH, TEST_DB_PATH);
    } else {
        const { execSync } = await import("node:child_process");
        execSync("bun x prisma migrate deploy", {
            env: { ...process.env, DATABASE_URL: TEST_DB_URL },
            stdio: "ignore"
        });
    }

    const adapter = new PrismaBetterSqlite3({ url: TEST_DB_URL });
    testPrismaClient = new PrismaClient({ adapter });

    // Enable foreign keys
    await testPrismaClient.$executeRawUnsafe("PRAGMA foreign_keys = ON;");

    // Assign to globalThis so lib/db and lib/actions use it if needed
    (globalThis as any).prisma = testPrismaClient;

    // Ensure base users exist
    await seedBaseUsers(testPrismaClient);

    return testPrismaClient;
}

// 5. Seed Canonical Base Users
export async function seedBaseUsers(prisma: PrismaClient | null = testPrismaClient): Promise<void> {
    const p = prisma ?? testPrismaClient;
    if (!p) return;
    for (const user of Object.values(BASE_USERS)) {
        await p.user.upsert({
            where: { id: user.id },
            update: { name: user.name, avatarUrl: user.avatarUrl },
            create: user
        });
    }
}

// 6. Reset Test DB between tests
export async function resetTestDb(options: { keepBaseUsers?: boolean; resetToDevCopy?: boolean } = { keepBaseUsers: true }): Promise<void> {
    if (options.resetToDevCopy && fs.existsSync(DEV_DB_PATH)) {
        if (testPrismaClient) {
            try {
                await testPrismaClient.$disconnect();
            } catch {}
        }
        cleanupTestDbFiles();
        fs.copyFileSync(DEV_DB_PATH, TEST_DB_PATH);
        const adapter = new PrismaBetterSqlite3({ url: TEST_DB_URL });
        testPrismaClient = new PrismaClient({ adapter });
        (globalThis as any).prisma = testPrismaClient;
        await testPrismaClient.$executeRawUnsafe("PRAGMA foreign_keys = ON;");
        return;
    }

    if (!testPrismaClient) {
        await setupTestDb();
    }

    const p = testPrismaClient!;
    const deleteOps: any[] = [];
    if ("seriesCheckin" in p) deleteOps.push((p as any).seriesCheckin.deleteMany());
    if ("seriesProgress" in p) deleteOps.push((p as any).seriesProgress.deleteMany());
    deleteOps.push(p.movieReview.deleteMany());
    deleteOps.push(p.watchlistItem.deleteMany());

    if (!options.keepBaseUsers) {
        deleteOps.push(p.user.deleteMany());
    }

    await p.$transaction(deleteOps);

    if (options.keepBaseUsers) {
        await seedBaseUsers(p);
    }
}

// 7. Cleanup Test Files
export function cleanupTestDbFiles(): void {
    const files = [
        TEST_DB_PATH,
        `${TEST_DB_PATH}-journal`,
        `${TEST_DB_PATH}-wal`,
        `${TEST_DB_PATH}-shm`
    ];
    for (const f of files) {
        if (fs.existsSync(f)) {
            try { fs.unlinkSync(f); } catch {}
        }
    }
}

// 8. Teardown
export async function teardownTestDb(): Promise<void> {
    if (testPrismaClient) {
        try {
            await testPrismaClient.$disconnect();
        } catch {}
        testPrismaClient = null;
    }
    (globalThis as any).prisma = undefined;
    cleanupTestDbFiles();
}

export function getTestPrisma(): PrismaClient {
    if (!testPrismaClient) {
        throw new Error("Test Prisma client not initialized. Call setupTestDb() first.");
    }
    return testPrismaClient;
}

/* ------------------------------------------------------------------ */
/* Production Action Delegation (Zero Shadow Domain Logic)            */
/* ------------------------------------------------------------------ */

export function formatEpisodeTag(seasonNumber: number, start: number, end: number): string {
    const sStr = String(seasonNumber).padStart(2, "0");
    if (start === end) {
        return `S${sStr} • Ep ${start}`;
    }
    return `S${sStr} • Eps ${start}-${end}`;
}

let _actions: typeof import("@/lib/actions") | null = null;
export async function getActions(): Promise<typeof import("@/lib/actions")> {
    if (!_actions) {
        _actions = await import("@/lib/actions");
    }
    return _actions;
}

// Canonical Server Actions delegated directly to @/lib/actions
export async function addSeriesProgress(input: AddSeriesProgressInput): Promise<DbSeriesProgress> {
    return (await getActions()).addSeriesProgress(input);
}

export async function addSeriesCheckin(input: AddSeriesCheckinInput): Promise<DbSeriesCheckin> {
    return (await getActions()).addSeriesCheckin(input);
}

export async function getSeriesProgressList(): Promise<DbSeriesProgressWithCheckins[]> {
    return (await getActions()).getSeriesProgressList();
}

export async function deleteSeriesProgress(id: string): Promise<{ success: boolean }> {
    return (await getActions()).deleteSeriesProgress(id);
}

export async function abandonSeriesProgress(id: string, input: AbandonSeriesInput): Promise<DbMovieReview> {
    return (await getActions()).abandonSeriesProgress(id, input);
}

export async function addMovieReview(input: MovieReviewInput): Promise<DbMovieReview> {
    return (await getActions()).addMovieReview(input);
}

export async function updateMovieReview(id: string, input: MovieReviewInput): Promise<DbMovieReview> {
    return (await getActions()).updateMovieReview(id, input);
}

export async function deleteMovieReview(id: string): Promise<{ success: boolean }> {
    await (await getActions()).deleteMovieReview(id);
    return { success: true };
}

export async function completeSeriesProgress(
    id: string,
    input: import("@/types").CompleteSeriesInput
): Promise<DbMovieReview> {
    return (await getActions()).completeSeriesProgress(id, input);
}

export async function getReviews(): Promise<DbMovieReview[]> {
    return (await getActions()).getReviews();
}

export async function getWatchlist(): Promise<DbWatchlistItem[]> {
    return (await getActions()).getWatchlist();
}

export async function addToWatchlist(input: {
    tmdbId: string;
    title: string;
    posterPath?: string;
    genres?: string[];
    runtime?: number;
    releaseDate?: string;
    overview?: string;
    addedById?: string;
    mediaType?: "movie" | "tv";
    numberOfSeasons?: number;
    numberOfEpisodes?: number;
}): Promise<DbWatchlistItem> {
    return (await getActions()).addToWatchlist({
        ...input,
        posterPath: input.posterPath ?? "",
        genres: input.genres ?? []
    });
}

export async function removeFromWatchlist(id: string): Promise<{ success: boolean }> {
    await (await getActions()).removeFromWatchlist(id);
    return { success: true };
}

export async function getUsers(): Promise<DbUser[]> {
    return (await getActions()).getUsers();
}

export async function setupUsers(input: {
    user1Name: string;
    user1Avatar?: string;
    user2Name: string;
    user2Avatar?: string;
}): Promise<DbUser[]> {
    return (await getActions()).setupUsers(input);
}

export async function exportData() {
    return (await getActions()).exportData();
}

export async function importData(raw: unknown) {
    return (await getActions()).importData(raw);
}

export async function mergeData(raw: unknown) {
    return (await getActions()).mergeData(raw);
}

export async function resetDatabase() {
    return (await getActions()).resetDatabase();
}

/* ------------------------------------------------------------------ */
/* Production Runtime Calculations                                    */
/* ------------------------------------------------------------------ */

export {
    getEntryDurationMinutes,
    calculateSeriesDuration,
    calculateTotalWatchTime,
    computeYearSummary,
    parseRuntimeInput,
    formatDuration,
    filterHistory,
    filterWatchlist,
    getRouletteCandidates,
    spinRoulette,
    getProfilesStats,
    getProfileCardData,
    calculateHeadToHeadStats
} from "@/lib/runtime";
