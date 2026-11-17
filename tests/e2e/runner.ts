import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { setupTestDb, teardownTestDb, cleanupTestDbFiles, DEV_DB_PATH, TEST_DB_URL } from "./harness";

interface TierResult {
    name: string;
    path: string;
    threshold: number;
    passed: number;
    failed: number;
    total: number;
    durationMs: number;
    success: boolean;
    output: string;
}

const TIERS = [
    { name: "Tier 1: Feature Happy Paths", dir: "tier1-features", threshold: 30 },
    { name: "Tier 2: Boundary & Edge Cases", dir: "tier2-boundaries", threshold: 30 },
    { name: "Tier 3: Pairwise Combinations", dir: "tier3-combinations", threshold: 6 },
    { name: "Tier 4: End-User Real Scenarios", dir: "tier4-scenarios", threshold: 5 }
];

function getFileHash(filePath: string): string | null {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(content).digest("hex");
}

async function main() {
    console.log("================================================================================");
    console.log("                 NOSSOSMOMENTOS E2E TEST RUNNER & SCORECARD                     ");
    console.log("================================================================================\n");

    // 1. Snapshot dev.db safety invariants (size, mtime, sha256)
    const devDbExists = fs.existsSync(DEV_DB_PATH);
    const devDbStats = devDbExists ? fs.statSync(DEV_DB_PATH) : null;
    const initialMtime = devDbStats?.mtimeMs;
    const initialSize = devDbStats?.size;
    const initialHash = getFileHash(DEV_DB_PATH);

    console.log(`[Safety] Pre-flight dev.db: ${initialSize ?? 0} bytes, hash: ${initialHash ? initialHash.slice(0, 16) + '...' : 'none'}`);
    console.log(`[Safety] Initializing isolated database: test.db`);

    // Setup isolated test database before runner starts
    await setupTestDb({ fromDevCopy: true });

    const results: TierResult[] = [];
    let allPassed = true;
    const startTime = Date.now();

    for (const tier of TIERS) {
        const tierPath = path.resolve(__dirname, tier.dir);
        if (!fs.existsSync(tierPath)) {
            console.error(`[Error] Missing tier directory: ${tierPath}`);
            results.push({
                name: tier.name,
                path: tier.dir,
                threshold: tier.threshold,
                passed: 0,
                failed: 1,
                total: 0,
                durationMs: 0,
                success: false,
                output: "Directory missing"
            });
            allPassed = false;
            continue;
        }

        console.log(`\n>>> Running ${tier.name} (Threshold: ≥ ${tier.threshold})`);
        const t0 = Date.now();

        // Spawn bun test for this specific tier
        const proc = Bun.spawn(["bun", "test", "--parallel=1", tierPath], {
            env: {
                ...process.env,
                DATABASE_URL: TEST_DB_URL,
                NODE_ENV: "test"
            },
            stdout: "pipe",
            stderr: "pipe"
        });

        const stdout = await new Response(proc.stdout).text();
        const stderr = await new Response(proc.stderr).text();
        const exitCode = await proc.exited;
        const durationMs = Date.now() - t0;

        const combinedOutput = stdout + stderr;

        // Parse bun test output: e.g. "31 pass", "0 fail"
        const passMatch = combinedOutput.match(/(\d+)\s+pass/);
        const failMatch = combinedOutput.match(/(\d+)\s+fail/);
        const passedCount = passMatch ? parseInt(passMatch[1], 10) : 0;
        const failedCount = failMatch ? parseInt(failMatch[1], 10) : (exitCode !== 0 ? 1 : 0);
        const totalCount = passedCount + failedCount;

        const tierSuccess = exitCode === 0 && failedCount === 0 && passedCount >= tier.threshold;
        if (!tierSuccess) allPassed = false;

        console.log(
            `    Result: ${passedCount}/${totalCount} passed (${durationMs}ms) - ` +
                (tierSuccess ? `✓ PASS` : `✗ FAIL (Expected ≥ ${tier.threshold})`)
        );

        if (exitCode !== 0 || failedCount > 0) {
            console.log(combinedOutput);
        }

        results.push({
            name: tier.name,
            path: tier.dir,
            threshold: tier.threshold,
            passed: passedCount,
            failed: failedCount,
            total: totalCount,
            durationMs,
            success: tierSuccess,
            output: combinedOutput
        });
    }

    // 2. Tear down isolated database and clean test files
    await teardownTestDb();
    cleanupTestDbFiles();

    // 3. Verify dev.db was never touched
    if (devDbExists) {
        const postStats = fs.statSync(DEV_DB_PATH);
        const postHash = getFileHash(DEV_DB_PATH);

        if (postStats.mtimeMs !== initialMtime || postStats.size !== initialSize || postHash !== initialHash) {
            console.error("\n[CRITICAL SAFETY FAILURE] dev.db was modified during test execution!");
            console.error(`Initial Size: ${initialSize}, Current Size: ${postStats.size}`);
            console.error(`Initial Hash: ${initialHash}, Current Hash: ${postHash}`);
            process.exit(1);
        }
        console.log(`\n[Safety] dev.db integrity verified 100% untouched (${postStats.size} bytes, hash unchanged).`);
    }

    // 4. Verify test.db cleanup
    if (fs.existsSync(path.resolve(process.cwd(), "test.db"))) {
        console.warn("[Warning] test.db remained after teardown, cleaning up...");
        cleanupTestDbFiles();
    }

    // 5. Print Unified Scorecard
    const totalDuration = Date.now() - startTime;
    const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
    const totalTests = totalPassed + totalFailed;

    console.log("\n================================================================================");
    console.log("                           FINAL EXECUTION SCORECARD                            ");
    console.log("================================================================================");
    for (const r of results) {
        const statusMark = r.success ? "✓ PASS" : "✗ FAIL";
        console.log(
            ` ${r.name.padEnd(35)} : ${String(r.passed).padStart(2)}/${String(r.total).padStart(2)} passed (Min: ${r.threshold}) [${r.durationMs}ms] ${statusMark}`
        );
    }
    console.log("--------------------------------------------------------------------------------");
    console.log(
        ` TOTAL TESTS                        : ${totalPassed}/${totalTests} passed [${totalDuration}ms] (Target: ≥ 71)`
    );
    console.log("================================================================================");

    if (allPassed && totalPassed >= 71) {
        console.log("\n>>> ALL TEST TIERS AND CRITERIA SATISFIED! EXITING 0.\n");
        process.exit(0);
    } else {
        console.error("\n>>> TEST SUITE FAILED OR CRITERIA UNMET! EXITING 1.\n");
        process.exit(1);
    }
}

if (import.meta.main) {
    main().catch((err) => {
        console.error("Fatal runner error:", err);
        cleanupTestDbFiles();
        process.exit(1);
    });
}
