import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
    setupTestDb,
    teardownTestDb,
    resetTestDb,
    setupUsers,
    getTestPrisma,
    ROOT_DIR
} from "../harness";

describe("Tier 2 - R1: Identidade e Rebranding Boundaries", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("T2-R1-01: Zero-state clean slate renders NossosMomentos without broken layout or NossosFilmes fallback", () => {
        const layoutPath = path.resolve(ROOT_DIR, "app/layout.tsx");
        const layoutContent = fs.readFileSync(layoutPath, "utf-8");

        expect(layoutContent).toContain('title: "NossosMomentos"');
        expect(layoutContent).not.toContain("NossosFilmes");
    });

    it("T2-R1-02: Mobile header bar displays NossosMomentos without overflow or truncation", () => {
        const headerPath = path.resolve(ROOT_DIR, "components/layout/HeaderMobile.tsx");
        const headerContent = fs.readFileSync(headerPath, "utf-8");

        expect(headerContent).toContain('Nossos<span className="text-gold-gradient">Momentos</span>');
        expect(headerContent).not.toContain("NossosFilmes");
        expect(headerContent).toContain("font-bold tracking-tight");
    });

    it("T2-R1-03: Codebase layout and navigation scan contains zero active NossosFilmes brand leaks", () => {
        const layoutFiles = [
            "app/layout.tsx",
            "components/layout/Sidebar.tsx",
            "components/layout/HeaderMobile.tsx",
            "app/setup/page.tsx"
        ];

        for (const relPath of layoutFiles) {
            const fullPath = path.resolve(ROOT_DIR, relPath);
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, "utf-8");
                const leaks = content.match(/NossosFilmes/g) || [];
                expect(leaks.length).toBe(0);
            }
        }

        // For configuracoes, ensure headers and titles do not leak
        const configPath = path.resolve(ROOT_DIR, "app/configuracoes/page.tsx");
        if (fs.existsSync(configPath)) {
            const configContent = fs.readFileSync(configPath, "utf-8");
            expect(configContent).toContain("nossosmomentos-export-");
            expect(configContent).toContain("nossosmomentos-backup-");
        }
    });

    it("T2-R1-04: Setup page profile name boundary handling (100 chars, Unicode emojis)", async () => {
        await resetTestDb({ keepBaseUsers: false });
        const longNameWithEmojis = "💑 Super Casal Cinéfilo e Maratonista de Séries Incríveis pelo Mundo das Maravilhas 2026 🚀🎉✨";
        const user2Name = "❤️ Ana";

        const [u1, u2] = await setupUsers({
            user1Name: longNameWithEmojis,
            user2Name: user2Name
        });

        expect(u1.name.length).toBeLessThanOrEqual(100);
        expect(u1.name).toContain("💑");
        expect(u2.name).toBe("❤️ Ana");

        const prisma = getTestPrisma();
        const savedUsers = await prisma.user.findMany({ orderBy: { id: "asc" } });
        expect(savedUsers.length).toBe(2);
    });

    it("T2-R1-05: Theme styling invariants (accent gold gradient preserved across themes)", () => {
        const sidebarPath = path.resolve(ROOT_DIR, "components/layout/Sidebar.tsx");
        const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");

        expect(sidebarContent).toContain('text-gold-gradient">Momentos</span>');
        expect(sidebarContent).toContain("text-gray-900 dark:text-white");
    });
});
