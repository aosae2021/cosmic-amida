import { AMIDA_CONFIG } from "./amidaConfig";

export const CUSTOM_PILLAR_COUNT = AMIDA_CONFIG.layout.pillarCount;
export const MAX_LABEL_LENGTH = 12;
export const MAX_TITLE_LENGTH = 24;

export interface CustomAmidaConfig {
    title: string | null;
    participants: string[];
    goals: string[];
}

export interface CustomAmidaPreset {
    id: string;
    label: string;
    title: string;
    participants: string[];
    goals: string[];
}

export const CUSTOM_AMIDA_PRESETS: CustomAmidaPreset[] = [
    {
        id: "lunch",
        label: "🍜 ランチ決め",
        title: "今日のランチ決め",
        participants: ["1", "2", "3", "4", "5"],
        goals: ["ラーメン", "カレー", "お寿司", "パスタ", "定食"],
    },
    {
        id: "prize",
        label: "🎁 景品抽選",
        title: "宇宙の景品抽選会",
        participants: ["Aさん", "Bさん", "Cさん", "Dさん", "Eさん"],
        goals: ["特賞", "1等", "2等", "3等", "参加賞"],
    },
    {
        id: "role",
        label: "🎤 担当決め",
        title: "役割・担当決め",
        participants: ["メンバー1", "メンバー2", "メンバー3", "メンバー4", "メンバー5"],
        goals: ["司会", "書記", "発表", "進行", "サポート"],
    },
];

function sanitizeItem(raw: string, fallback: string, maxLen = MAX_LABEL_LENGTH): string {
    const trimmed = raw.trim().replace(/[\r\n]/g, "");
    if (!trimmed) return fallback;
    return trimmed.slice(0, maxLen);
}

/**
 * 5枠ぶんのラベル配列を正規化する
 */
export function normalizeLabels(items: string[], fallbackPrefix: string): string[] {
    return Array.from({ length: CUSTOM_PILLAR_COUNT }, (_, i) =>
        sanitizeItem(items[i] ?? "", `${fallbackPrefix}${i + 1}`)
    );
}

/**
 * URL クエリ文字列（例: ?p=A,B,C,D,E&g=特賞,1等,2等,3等,参加賞&t=抽選会）から
 * カスタムあみだ設定を復元する。未指定なら null。
 */
export function parseCustomAmidaFromSearch(search: string): CustomAmidaConfig | null {
    const params = new URLSearchParams(search);
    const rawP = params.get("p");
    const rawG = params.get("g");
    const rawT = params.get("t");

    if (!rawP && !rawG) return null;

    const participants = rawP
        ? normalizeLabels(rawP.split(","), "")
        : Array.from({ length: CUSTOM_PILLAR_COUNT }, (_, i) => String(i + 1));

    const goals = rawG
        ? normalizeLabels(rawG.split(","), "結果")
        : ["大吉", "中吉", "小吉", "吉", "末吉"];

    const title = rawT ? sanitizeItem(rawT, "", MAX_TITLE_LENGTH) || null : null;

    return { title, participants, goals };
}

/**
 * カスタム設定から共有用のクエリ文字列（先頭 ? 付き）を生成する
 */
export function buildCustomAmidaQuery(config: CustomAmidaConfig): string {
    const params = new URLSearchParams();
    if (config.title && config.title.trim()) {
        params.set("t", config.title.trim().slice(0, MAX_TITLE_LENGTH));
    }
    params.set(
        "p",
        normalizeLabels(config.participants, "").join(",")
    );
    params.set(
        "g",
        normalizeLabels(config.goals, "結果").join(",")
    );
    return `?${params.toString()}`;
}
