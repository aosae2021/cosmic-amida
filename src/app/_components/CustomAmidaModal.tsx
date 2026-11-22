"use client";

/**
 * CustomAmidaModal.tsx
 *
 * 幹事・イベント向けのカスタムあみだくじ設定モーダル。
 * 参加者名（スタート側5枠）と景品・結果（ゴール側5枠）を自由入力し、
 * URL クエリパラメータでそのまま SNS 共有できる。
 */

import { useState } from "react";
import { useGameStore } from "../../hooks/useGameStore";
import {
    buildCustomAmidaQuery,
    CUSTOM_AMIDA_PRESETS,
    CUSTOM_PILLAR_COUNT,
    MAX_LABEL_LENGTH,
    MAX_TITLE_LENGTH,
    normalizeLabels,
} from "../../lib/customAmida";

interface CustomAmidaModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DEFAULT_PARTICIPANTS = Array.from({ length: CUSTOM_PILLAR_COUNT }, (_, i) => String(i + 1));
const DEFAULT_GOALS = ["大吉", "中吉", "小吉", "吉", "末吉"];

export default function CustomAmidaModal({ isOpen, onClose }: CustomAmidaModalProps) {
    const customTitle = useGameStore((s) => s.customTitle);
    const customParticipants = useGameStore((s) => s.customParticipants);
    const customGoals = useGameStore((s) => s.customGoals);
    const setCustomConfig = useGameStore((s) => s.setCustomConfig);
    const clearCustomConfig = useGameStore((s) => s.clearCustomConfig);

    const [title, setTitle] = useState<string>(customTitle ?? "");
    const [participants, setParticipants] = useState<string[]>(
        customParticipants ?? DEFAULT_PARTICIPANTS
    );
    const [goals, setGoals] = useState<string[]>(customGoals ?? DEFAULT_GOALS);
    const [copiedUrl, setCopiedUrl] = useState(false);

    if (!isOpen) return null;

    const handleApplyPreset = (presetId: string) => {
        const preset = CUSTOM_AMIDA_PRESETS.find((p) => p.id === presetId);
        if (!preset) return;
        setTitle(preset.title);
        setParticipants([...preset.participants]);
        setGoals([...preset.goals]);
    };

    const syncUrl = (query: string) => {
        if (typeof window === "undefined") return;
        const nextUrl = `${window.location.pathname}${query}`;
        window.history.replaceState(null, "", nextUrl);
    };

    const handleApply = () => {
        const normalizedParticipants = normalizeLabels(participants, "");
        const normalizedGoals = normalizeLabels(goals, "結果");
        const cleanTitle = title.trim().slice(0, MAX_TITLE_LENGTH) || null;

        setCustomConfig({
            title: cleanTitle,
            participants: normalizedParticipants,
            goals: normalizedGoals,
        });

        const query = buildCustomAmidaQuery({
            title: cleanTitle,
            participants: normalizedParticipants,
            goals: normalizedGoals,
        });
        syncUrl(query);
        onClose();
    };

    const handleResetDefault = () => {
        clearCustomConfig();
        setTitle("");
        setParticipants(DEFAULT_PARTICIPANTS);
        setGoals(DEFAULT_GOALS);
        syncUrl("");
        onClose();
    };

    const handleCopyShareUrl = async () => {
        const normalizedParticipants = normalizeLabels(participants, "");
        const normalizedGoals = normalizeLabels(goals, "結果");
        const cleanTitle = title.trim().slice(0, MAX_TITLE_LENGTH) || null;

        const query = buildCustomAmidaQuery({
            title: cleanTitle,
            participants: normalizedParticipants,
            goals: normalizedGoals,
        });
        const fullUrl =
            typeof window !== "undefined"
                ? `${window.location.origin}${window.location.pathname}${query}`
                : `https://cosmic-amida.pages.dev/${query}`;

        try {
            await navigator.clipboard.writeText(fullUrl);
            setCopiedUrl(true);
            setTimeout(() => setCopiedUrl(false), 2000);
        } catch {
            setCopiedUrl(false);
        }
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="custom-amida-heading"
            className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-blue-300/30 bg-[#08112b]/95 p-5 sm:p-6 text-slate-100 shadow-2xl space-y-5"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-blue-400/20 pb-3">
                    <div>
                        <h2 id="custom-amida-heading" className="text-lg font-extrabold text-white">
                            ⚙️ カスタムあみだくじ
                        </h2>
                        <p className="text-xs text-blue-200/80 mt-0.5">
                            参加者名・景品名を自由に入力してURLで共有できます
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="閉じる"
                        className="rounded-lg px-2.5 py-1 text-slate-300 hover:bg-white/10 hover:text-white"
                    >
                        ✕
                    </button>
                </div>

                {/* プリセット */}
                <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-blue-300">プリセット</span>
                    <div className="flex flex-wrap gap-2">
                        {CUSTOM_AMIDA_PRESETS.map((preset) => (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => handleApplyPreset(preset.id)}
                                className="rounded-full border border-blue-400/35 bg-blue-950/60 px-3 py-1 text-xs font-semibold text-blue-100 hover:bg-blue-800/60 transition-colors"
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* タイトル */}
                <div className="space-y-1">
                    <label htmlFor="custom-title" className="text-xs font-semibold text-blue-300">
                        タイトル（任意）
                    </label>
                    <input
                        id="custom-title"
                        type="text"
                        maxLength={MAX_TITLE_LENGTH}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="例: 今日のランチ決め / 忘年会抽選"
                        className="w-full rounded-lg border border-blue-300/25 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-400 focus:outline-none"
                    />
                </div>

                {/* スタート側 & ゴール側 */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <span className="text-xs font-semibold text-blue-300">
                            スタート（参加者 / 番号）
                        </span>
                        {participants.map((val, idx) => (
                            <input
                                key={`p-${idx}`}
                                type="text"
                                maxLength={MAX_LABEL_LENGTH}
                                value={val}
                                aria-label={`参加者 ${idx + 1}`}
                                onChange={(e) => {
                                    const next = [...participants];
                                    next[idx] = e.target.value;
                                    setParticipants(next);
                                }}
                                placeholder={`柱 ${idx + 1}`}
                                className="w-full rounded-lg border border-blue-300/20 bg-slate-900/80 px-2.5 py-1.5 text-sm text-white focus:border-blue-400 focus:outline-none"
                            />
                        ))}
                    </div>

                    <div className="space-y-2">
                        <span className="text-xs font-semibold text-amber-300">
                            ゴール（景品 / 結果）
                        </span>
                        {goals.map((val, idx) => (
                            <input
                                key={`g-${idx}`}
                                type="text"
                                maxLength={MAX_LABEL_LENGTH}
                                value={val}
                                aria-label={`結果 ${idx + 1}`}
                                onChange={(e) => {
                                    const next = [...goals];
                                    next[idx] = e.target.value;
                                    setGoals(next);
                                }}
                                placeholder={`結果 ${idx + 1}`}
                                className="w-full rounded-lg border border-amber-300/25 bg-slate-900/80 px-2.5 py-1.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                            />
                        ))}
                    </div>
                </div>

                {/* アクション */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-blue-400/20 pt-4">
                    <button
                        type="button"
                        onClick={handleResetDefault}
                        className="rounded-lg border border-slate-500/50 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
                    >
                        おみくじに戻す
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={handleCopyShareUrl}
                            className="rounded-lg border border-indigo-400/50 bg-indigo-950/70 px-3.5 py-2 text-xs font-bold text-indigo-100 hover:bg-indigo-800/70"
                        >
                            {copiedUrl ? "✓ 共有URLをコピー済み" : "🔗 共有URLコピー"}
                        </button>
                        <button
                            type="button"
                            onClick={handleApply}
                            className="rounded-lg bg-blue-500 px-4 py-2 text-xs font-bold text-white shadow hover:bg-blue-400"
                        >
                            適用して遊ぶ
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
