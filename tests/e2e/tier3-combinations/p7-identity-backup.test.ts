import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
    setupTestDb,
    teardownTestDb,
    resetTestDb,
    exportData,
    importData,
    ROOT_DIR,
    USER_1,
    USER_2
} from "../harness";

describe("Tier 3 - Pairwise 7: Identity Branding Consistency in Backups (R1 × R6)", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("T3-PAIR-07: Rebranding identity propagation in backup payloads & metadata", async () => {
        // 1. Export fresh backup
        const backup = await exportData();
        expect(backup.version).toBeGreaterThanOrEqual(2);
        expect(backup.exportedAt).toBeDefined();

        // 2. Settings export filename validation
        const configPath = path.resolve(ROOT_DIR, "app/configuracoes/page.tsx");
        const configContent = fs.readFileSync(configPath, "utf-8");
        expect(configContent).toContain("nossosmomentos-export-");
        expect(configContent).toContain("nossosmomentos-backup-");

        // 3. Import legacy-structured payload named or originating from legacy era
        const legacyPayload = {
            version: 1,
            exportedAt: "2026-10-01T00:00:00.000Z",
            users: [USER_1, USER_2],
            reviews: [
                {
                    id: "leg-movie-1",
                    tmdbId: "m-legacy-1",
                    title: "Legacy Filmes Era Movie",
                    posterPath: "/p.jpg",
                    dateWatched: "2026-10-01",
                    ratingUser1: 4.5,
                    ratingUser2: 4.5,
                    textReview: "Movie from old era",
                    genres: ["Ação"],
                    recommendedById: USER_1.id
                }
            ],
            watchlist: []
        };

        const result = await importData(legacyPayload);
        expect(result.users).toBe(2);
        expect(result.reviews).toBe(1);

        // 4. Ensure app identity remains NossosMomentos and never regresses
        const layoutPath = path.resolve(ROOT_DIR, "app/layout.tsx");
        const layoutContent = fs.readFileSync(layoutPath, "utf-8");
        expect(layoutContent).toContain('title: "NossosMomentos"');
        expect(layoutContent).not.toContain("NossosFilmes");
    });
});
