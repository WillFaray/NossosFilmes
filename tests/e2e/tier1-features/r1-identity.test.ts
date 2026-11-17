import { describe, it, expect } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { ROOT_DIR } from "../harness";

describe("Tier 1 - R1: Identidade e Rebranding NossosMomentos", () => {
    it("T1-R1-01: Document metadata, title, and description reflect NossosMomentos", () => {
        const layoutPath = path.resolve(ROOT_DIR, "app/layout.tsx");
        expect(fs.existsSync(layoutPath)).toBe(true);
        const layoutContent = fs.readFileSync(layoutPath, "utf-8");

        // Document title must be NossosMomentos
        expect(layoutContent).toContain('title: "NossosMomentos"');
        // Description must mention momentos/casal
        expect(layoutContent).toMatch(/description:.*momentos/i);
        // Metadata title must not contain NossosFilmes
        expect(layoutContent).not.toContain('title: "NossosFilmes"');
    });

    it("T1-R1-02: Desktop Sidebar header displays NossosMomentos with brand styling", () => {
        const sidebarPath = path.resolve(ROOT_DIR, "components/layout/Sidebar.tsx");
        expect(fs.existsSync(sidebarPath)).toBe(true);
        const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");

        // Brand logo anchor renders NossosMomentos with accent styling
        expect(sidebarContent).toContain('Nossos<span className="text-gold-gradient">Momentos</span>');
        expect(sidebarContent).not.toContain('Nossos<span className="text-gold-gradient">Filmes</span>');
    });

    it("T1-R1-03: Mobile Header renders NossosMomentos brand consistently", () => {
        const headerPath = path.resolve(ROOT_DIR, "components/layout/HeaderMobile.tsx");
        expect(fs.existsSync(headerPath)).toBe(true);
        const headerContent = fs.readFileSync(headerPath, "utf-8");

        // Mobile header displays NossosMomentos
        expect(headerContent).toContain('Nossos<span className="text-gold-gradient">Momentos</span>');
        expect(headerContent).not.toContain('Nossos<span className="text-gold-gradient">Filmes</span>');
    });

    it("T1-R1-04: Onboarding Setup page welcome banner displays NossosMomentos", () => {
        const setupPath = path.resolve(ROOT_DIR, "app/setup/page.tsx");
        expect(fs.existsSync(setupPath)).toBe(true);
        const setupContent = fs.readFileSync(setupPath, "utf-8");

        // Welcome heading shows Bem-vindo ao NossosMomentos!
        expect(setupContent).toMatch(/Bem-vindo ao\s*.*NossosMomentos/);
        expect(setupContent).not.toMatch(/Bem-vindo ao\s*.*NossosFilmes/);
    });

    it("T1-R1-05: Settings data export and backup file names reflect nossosmomentos", () => {
        const configPath = path.resolve(ROOT_DIR, "app/configuracoes/page.tsx");
        expect(fs.existsSync(configPath)).toBe(true);
        const configContent = fs.readFileSync(configPath, "utf-8");

        // Downloaded JSON and backup DB filenames reflect nossosmomentos
        expect(configContent).toContain("nossosmomentos-export-");
        expect(configContent).toContain("nossosmomentos-backup-");
        expect(configContent).not.toContain("nossosfilmes-export-");
        expect(configContent).not.toContain("nossosfilmes-backup-");
    });
});
