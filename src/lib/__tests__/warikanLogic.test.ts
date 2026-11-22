import { describe, it, expect } from "vitest";
import {
    calculateWarikanAmounts,
    generateWarikanLadder,
} from "../warikanLogic";

describe("warikanLogic", () => {
    it("均等パターンで合計金額が厳密に一致する", () => {
        const { amounts } = calculateWarikanAmounts({
            totalAmount: 23450,
            memberCount: 5,
            pattern: "equal",
        });
        expect(amounts).toHaveLength(5);
        expect(amounts.reduce((a, b) => a + b, 0)).toBe(23450);
    });

    it("1人無料パターンで1人が0円になり、合計金額が一致する", () => {
        const { amounts, warning } = calculateWarikanAmounts({
            totalAmount: 20000,
            memberCount: 5,
            pattern: "one_free",
            maxPerPerson: 6000,
        });
        expect(warning).toBeNull();
        expect(amounts).toContain(0);
        expect(amounts.every((a) => a <= 6000)).toBe(true);
        expect(amounts.reduce((a, b) => a + b, 0)).toBe(20000);
    });

    it("1人無料パターンで最大金額キャップを超える場合、上限を厳守しつつ自動調整する", () => {
        const { amounts, warning } = calculateWarikanAmounts({
            totalAmount: 20000,
            memberCount: 5,
            pattern: "one_free",
            maxPerPerson: 4500,
        });
        expect(warning).not.toBeNull();
        expect(amounts.every((a) => a <= 4500)).toBe(true);
        expect(amounts.reduce((a, b) => a + b, 0)).toBe(20000);
    });

    it("プラマイ率ランダムパターンで上限キャップと合計一致を複数試行で常に満たす", () => {
        for (let trial = 0; trial < 30; trial++) {
            const { amounts } = calculateWarikanAmounts({
                totalAmount: 30000,
                memberCount: 6,
                pattern: "random_range",
                rangePercent: 60,
                maxPerPerson: 7000,
            });
            expect(amounts).toHaveLength(6);
            expect(amounts.every((a) => a >= 0 && a <= 7000)).toBe(true);
            expect(amounts.reduce((a, b) => a + b, 0)).toBe(30000);
        }
    });

    it("あみだくじ生成が2〜8人すべてで1対1対応（全単射）になる", () => {
        for (let n = 2; n <= 8; n++) {
            const ladder = generateWarikanLadder(n);
            const sorted = [...ladder.startToGoal].sort((a, b) => a - b);
            expect(sorted).toEqual(Array.from({ length: n }, (_, i) => i));
        }
    });
});
