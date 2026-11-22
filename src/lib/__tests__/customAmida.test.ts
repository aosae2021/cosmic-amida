import { describe, it, expect } from "vitest";
import {
    buildCustomAmidaQuery,
    parseCustomAmidaFromSearch,
    CUSTOM_PILLAR_COUNT,
} from "../customAmida";

describe("customAmida", () => {
    it("クエリが無い場合は null を返す", () => {
        expect(parseCustomAmidaFromSearch("")).toBeNull();
        expect(parseCustomAmidaFromSearch("?device=iphone")).toBeNull();
    });

    it("カスタム設定をクエリへエンコードし、元の設定へ復元できる", () => {
        const input = {
            title: "忘年会くじ",
            participants: ["田中", "佐藤", "鈴木", "高橋", "伊藤"],
            goals: ["特賞", "1等", "2等", "3等", "参加賞"],
        };
        const query = buildCustomAmidaQuery(input);
        const parsed = parseCustomAmidaFromSearch(query);

        expect(parsed).not.toBeNull();
        expect(parsed?.title).toBe("忘年会くじ");
        expect(parsed?.participants).toEqual(input.participants);
        expect(parsed?.goals).toEqual(input.goals);
    });

    it("要素数が不足している場合は5枠ぶん自動補完される", () => {
        const parsed = parseCustomAmidaFromSearch("?g=ラーメン,カレー");
        expect(parsed).not.toBeNull();
        expect(parsed?.participants).toHaveLength(CUSTOM_PILLAR_COUNT);
        expect(parsed?.goals).toHaveLength(CUSTOM_PILLAR_COUNT);
        expect(parsed?.goals[0]).toBe("ラーメン");
        expect(parsed?.goals[2]).toBe("結果3");
    });
});
