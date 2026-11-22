/**
 * Playwright E2E 設定
 * 開発サーバー (npm run dev) 起動後に test:e2e で実行する想定
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: "list",
    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
        trace: "on-first-retry",
        video: "on-first-retry",
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: process.env.CI
        ? { command: "npm run dev", url: "http://localhost:3000", timeout: 120000 }
        : undefined,
});
