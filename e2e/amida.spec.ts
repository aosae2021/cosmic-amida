/**
 * メインあみだ画面（Fortune Flow 3D）の E2E テスト
 *
 * - トップページが表示され、選択フェーズの案内が出ること
 * - 致命的なコンソールエラーがないこと
 * - スキップボタンで結果まで遷移できること（動作確認）
 *
 * 実行: 開発サーバー起動後 `npm run test:e2e` または
 *       `PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test e2e/amida.spec.ts`
 */
import { test, expect } from "@playwright/test";

test.describe("メインあみだ画面 (Fortune Flow 3D)", () => {
    test("トップページが表示され選択案内が出る", async ({ page }) => {
        const consoleErrors: string[] = [];
        page.on("console", (msg) => {
            if (msg.type() === "error") consoleErrors.push(msg.text());
        });

        await page.goto("/");
        await expect(
            page.getByText("柱を選んでください", { exact: true })
        ).toBeVisible({ timeout: 15000 });

        const fatal = consoleErrors.filter(
            (t) =>
                t.includes("FATAL") ||
                t.includes("disconnected from the scene hierarchy") ||
                (t.includes("Error") && !t.includes("ResizeObserver"))
        );
        expect(fatal, "致命的なコンソールエラーがないこと").toHaveLength(0);
    });

    test("スキップで結果画面まで遷移し、もう一度ボタンが表示される", async ({
        page,
    }) => {
        await page.goto("/");
        await expect(
            page.getByText("柱を選んでください", { exact: true })
        ).toBeVisible({ timeout: 15000 });

        await page.getByRole("button", { name: /スキップ/ }).click();
        await expect(
            page.getByRole("button", { name: /もう一度/ })
        ).toBeVisible({ timeout: 8000 });
    });
});
