/**
 * メインあみだ画面（Cosmic Amida）および情報ページの E2E テスト
 *
 * - トップページが表示され、選択フェーズの案内とナビゲーションが出ること
 * - 致命的なコンソールエラーがないこと
 * - スキップボタンで結果まで遷移し、SNSシェアボタンと「もう一度」ボタンが表示されること
 * - /about（遊び方・FAQ）および /privacy（プライバシーポリシー）が正常に表示されること
 */
import { test, expect } from "@playwright/test";

test.describe("Cosmic Amida E2E", () => {
    test("トップページが表示され選択案内とナビゲーションが出る", async ({ page }) => {
        const consoleErrors: string[] = [];
        page.on("console", (msg) => {
            if (msg.type() === "error") consoleErrors.push(msg.text());
        });

        await page.goto("/");
        await expect(
            page.getByText("柱を選んでください", { exact: true })
        ).toBeVisible({ timeout: 15000 });

        await expect(page.getByRole("link", { name: "遊び方・FAQ" })).toBeVisible();
        await expect(page.getByRole("link", { name: "プライバシーポリシー" })).toBeVisible();

        const fatal = consoleErrors.filter(
            (t) =>
                t.includes("FATAL") ||
                t.includes("disconnected from the scene hierarchy") ||
                (t.includes("Error") && !t.includes("ResizeObserver"))
        );
        expect(fatal, "致命的なコンソールエラーがないこと").toHaveLength(0);
    });

    test("スキップで結果画面まで遷移し、シェアボタンともう一度ボタンが表示される", async ({
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
        await expect(
            page.getByRole("button", { name: /X（旧Twitter）で結果をシェアする/ })
        ).toBeEnabled();
        await expect(
            page.getByRole("button", { name: /LINEで結果をシェアする/ })
        ).toBeEnabled();
    });

    test("遊び方・FAQページとプライバシーポリシーページが表示される", async ({ page }) => {
        await page.goto("/about");
        await expect(
            page.getByRole("heading", { name: /Cosmic Amida について・遊び方/ })
        ).toBeVisible();

        await page.goto("/privacy");
        await expect(
            page.getByRole("heading", { name: "プライバシーポリシー", exact: true })
        ).toBeVisible();
    });

    test("URLクエリからカスタムあみだくじ設定が復元され、モーダルも開閉できる", async ({
        page,
    }) => {
        await page.goto("/?t=ランチ決め&p=A,B,C,D,E&g=ラーメン,カレー,寿司,パスタ,定食");
        await expect(page.getByText("ランチ決め — 柱を選んでください")).toBeVisible({
            timeout: 15000,
        });

        await page.getByRole("button", { name: "カスタムあみだくじを設定する" }).click();
        await expect(
            page.getByRole("heading", { name: /カスタムあみだくじ/ })
        ).toBeVisible();
        await page.getByRole("button", { name: "閉じる" }).click();
    });

    test("宇宙割り勘モードで最大金額指定・柱選択・精算表表示まで動作する", async ({
        page,
    }) => {
        await page.goto("/warikan");
        await expect(
            page.getByRole("heading", { name: /宇宙割り勘あみだくじ/ })
        ).toBeVisible();

        // 合計20000円・最大上限6000円を指定して連打スキップで柱選択へ
        await page.fill("#warikan-total", "20000");
        await page.fill("#warikan-max", "6000");
        await page.getByRole("button", { name: /連打をスキップしてすぐ柱を選ぶ/ }).click();

        // 4人分の柱を選択
        for (let i = 0; i < 4; i++) {
            await page.getByRole("button", { name: new RegExp(`柱 ${i + 1}`) }).click();
        }

        // 結果を一気に見るで精算表へ
        await page.getByRole("button", { name: /全員の結果を一気に見る/ }).click();
        await expect(
            page.getByRole("heading", { name: /宇宙割り勘 精算表/ })
        ).toBeVisible();
        await expect(page.getByText(/合計 ¥20,000（一致 ✓）/)).toBeVisible();
    });
});
