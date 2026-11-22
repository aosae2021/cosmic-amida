"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
    calculateWarikanAmounts,
    generateWarikanLadder,
    type WarikanLadder,
    type WarikanPattern,
} from "../../../lib/warikanLogic";
import { soundManager } from "../../../lib/sound";
import AdSlot from "../../_components/AdSlot";

const WarikanScene3D = dynamic(() => import("./WarikanScene3D"), { ssr: false });

type Stage = "setup" | "mash" | "mash_rank" | "select" | "reveal" | "summary";

interface MemberEntry {
    id: number;
    name: string;
    mashScore: number;
}

const RANGE_OPTIONS = [10, 20, 30, 50, 100] as const;
const MASH_DURATION_MS = 3000;
const SITE_URL = "https://cosmic-amida.pages.dev/warikan";

export default function WarikanApp() {
    // ─── Setup State ───
    const [memberCount, setMemberCount] = useState<number>(4);
    const [totalAmountStr, setTotalAmountStr] = useState<string>("20000");
    const [maxAmountStr, setMaxAmountStr] = useState<string>("");
    const [pattern, setPattern] = useState<WarikanPattern>("one_free");
    const [rangePercent, setRangePercent] = useState<number>(30);
    const [memberNames, setMemberNames] = useState<string[]>([
        "参加者1",
        "参加者2",
        "参加者3",
        "参加者4",
        "参加者5",
        "参加者6",
        "参加者7",
        "参加者8",
    ]);

    // ─── Flow State ───
    const [stage, setStage] = useState<Stage>("setup");
    const [members, setMembers] = useState<MemberEntry[]>([]);
    const [mashIndex, setMashIndex] = useState<number>(0);
    const [mashState, setMashState] = useState<"ready" | "active" | "done">("ready");
    const [mashRemainingMs, setMashRemainingMs] = useState<number>(MASH_DURATION_MS);
    const [currentTaps, setCurrentTaps] = useState<number>(0);

    // ─── Ladder & Allocation State ───
    const [ladder, setLadder] = useState<WarikanLadder | null>(null);
    const [goalAmounts, setGoalAmounts] = useState<number[]>([]);
    const [allocationWarning, setAllocationWarning] = useState<string | null>(null);
    /** pillarIndex -> memberId (選択済みマッピング) */
    const [pillarAssignments, setPillarAssignments] = useState<Record<number, number>>({});
    const [selectOrderIdx, setSelectOrderIdx] = useState<number>(0);
    const [peekGoals, setPeekGoals] = useState<boolean>(false);

    // ─── Reveal Animation State ───
    const [revealIdx, setRevealIdx] = useState<number>(0);
    const [traceProgress, setTraceProgress] = useState<number>(0);
    const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

    const mashTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const revealRafRef = useRef<number | null>(null);

    const totalAmount = Math.max(0, parseInt(totalAmountStr.replace(/[^\d]/g, ""), 10) || 0);
    const parsedMax = maxAmountStr.trim()
        ? parseInt(maxAmountStr.replace(/[^\d]/g, ""), 10)
        : null;
    const maxPerPerson = parsedMax !== null && !Number.isNaN(parsedMax) && parsedMax > 0 ? parsedMax : null;
    const minRequiredCap = memberCount > 0 ? Math.ceil(totalAmount / memberCount) : 0;
    const isMaxTooLow = maxPerPerson !== null && maxPerPerson * memberCount < totalAmount;

    const activeNames = useMemo(
        () =>
            Array.from({ length: memberCount }, (_, i) =>
                (memberNames[i] ?? "").trim() || `参加者${i + 1}`
            ),
        [memberCount, memberNames]
    );

    // クリーンアップ
    useEffect(() => {
        return () => {
            if (mashTimerRef.current) clearInterval(mashTimerRef.current);
            if (revealRafRef.current) cancelAnimationFrame(revealRafRef.current);
        };
    }, []);

    const prepareLadderAndAmounts = () => {
        const alloc = calculateWarikanAmounts({
            totalAmount,
            memberCount,
            pattern,
            rangePercent,
            maxPerPerson,
        });
        const newLadder = generateWarikanLadder(memberCount);
        setGoalAmounts(alloc.amounts);
        setAllocationWarning(alloc.warning);
        setLadder(newLadder);
        setPillarAssignments({});
        setSelectOrderIdx(0);
        setRevealIdx(0);
        setTraceProgress(0);
    };

    const handleStartMash = () => {
        if (totalAmount <= 0 || isMaxTooLow) return;
        soundManager.unlock();
        const initMembers: MemberEntry[] = activeNames.map((name, id) => ({
            id,
            name,
            mashScore: 0,
        }));
        setMembers(initMembers);
        setMashIndex(0);
        setMashState("ready");
        setCurrentTaps(0);
        setMashRemainingMs(MASH_DURATION_MS);
        prepareLadderAndAmounts();
        setStage("mash");
    };

    const handleSkipMash = () => {
        if (totalAmount <= 0 || isMaxTooLow) return;
        soundManager.unlock();
        const initMembers: MemberEntry[] = activeNames.map((name, id) => ({
            id,
            name,
            mashScore: 0,
        }));
        setMembers(initMembers);
        prepareLadderAndAmounts();
        setStage("select");
    };

    const beginCurrentMashTurn = () => {
        soundManager.playPon();
        setCurrentTaps(0);
        setMashState("active");
        const startTime = Date.now();
        setMashRemainingMs(MASH_DURATION_MS);

        if (mashTimerRef.current) clearInterval(mashTimerRef.current);
        mashTimerRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const left = Math.max(0, MASH_DURATION_MS - elapsed);
            setMashRemainingMs(left);
            if (left <= 0) {
                if (mashTimerRef.current) clearInterval(mashTimerRef.current);
                setMashState("done");
                soundManager.playBallCorner();
            }
        }, 50);
    };

    const handleMashTap = () => {
        if (mashState !== "active") return;
        setCurrentTaps((prev) => {
            const next = prev + 1;
            soundManager.playChargeTick(Math.min(1, next / 30));
            return next;
        });
    };

    const handleNextMashPlayer = () => {
        const updated = members.map((m, idx) =>
            idx === mashIndex ? { ...m, mashScore: currentTaps } : m
        );
        setMembers(updated);

        if (mashIndex + 1 < updated.length) {
            setMashIndex(mashIndex + 1);
            setMashState("ready");
            setCurrentTaps(0);
            setMashRemainingMs(MASH_DURATION_MS);
        } else {
            // ランキング順にソート（同点はランダム）
            const ranked = [...updated].sort((a, b) =>
                b.mashScore !== a.mashScore ? b.mashScore - a.mashScore : Math.random() - 0.5
            );
            setMembers(ranked);
            setStage("mash_rank");
        }
    };

    const handleSelectPillar = (pillarIndex: number) => {
        if (pillarAssignments[pillarIndex] !== undefined) return;
        const currentMember = members[selectOrderIdx];
        if (!currentMember) return;

        soundManager.playSelect();
        const nextAssignments = { ...pillarAssignments, [pillarIndex]: currentMember.id };
        setPillarAssignments(nextAssignments);

        if (selectOrderIdx + 1 < members.length) {
            setSelectOrderIdx(selectOrderIdx + 1);
        } else {
            setRevealIdx(0);
            setStage("reveal");
        }
    };

    // 選択済みメンバーと結果金額のマッピング（表示順: members 配列順）
    const finalResults = useMemo(() => {
        if (!ladder) return [];
        return members.map((member) => {
            const pillarEntry = Object.entries(pillarAssignments).find(
                ([, mId]) => mId === member.id
            );
            const startIndex = pillarEntry ? Number(pillarEntry[0]) : 0;
            const goalIndex = ladder.startToGoal[startIndex] ?? 0;
            const amount = goalAmounts[goalIndex] ?? 0;
            return {
                member,
                startIndex,
                goalIndex,
                amount,
            };
        });
    }, [ladder, members, pillarAssignments, goalAmounts]);

    // Reveal フェーズの 3D 降下アニメーション
    useEffect(() => {
        if (stage !== "reveal" || finalResults.length === 0) return;

        const durationMs = 1500;
        const start = performance.now();
        soundManager.playBallSweep();

        const tick = (now: number) => {
            const p = Math.min(1, (now - start) / durationMs);
            setTraceProgress(p);
            if (p < 1) {
                revealRafRef.current = requestAnimationFrame(tick);
            } else {
                soundManager.playBallCorner();
            }
        };
        revealRafRef.current = requestAnimationFrame(tick);

        return () => {
            if (revealRafRef.current) cancelAnimationFrame(revealRafRef.current);
        };
    }, [stage, revealIdx, finalResults.length]);

    const fireSummaryConfetti = () => {
        soundManager.playResult("大吉");
        confetti({
            particleCount: 140,
            spread: 110,
            origin: { y: 0.6 },
        });
    };

    const handleNextReveal = () => {
        if (revealIdx + 1 < finalResults.length) {
            setRevealIdx(revealIdx + 1);
            setTraceProgress(0);
        } else {
            setStage("summary");
            fireSummaryConfetti();
        }
    };

    const handleSkipToSummary = () => {
        if (revealRafRef.current) cancelAnimationFrame(revealRafRef.current);
        setTraceProgress(1);
        setStage("summary");
        fireSummaryConfetti();
    };

    // 精算シェアテキスト生成
    const maxPaid = useMemo(
        () => Math.max(0, ...finalResults.map((r) => r.amount)),
        [finalResults]
    );
    const minPaid = useMemo(
        () => (finalResults.length > 0 ? Math.min(...finalResults.map((r) => r.amount)) : 0),
        [finalResults]
    );

    const summaryText = useMemo(() => {
        const lines = finalResults.map((r) => {
            const tag =
                r.amount === 0
                    ? " 🎉タダ飯！"
                    : r.amount === maxPaid && maxPaid > minPaid
                    ? " 🔥MVP"
                    : "";
            return `・${r.member.name}: ¥${r.amount.toLocaleString()}${tag}`;
        });
        return `🌌 Cosmic Amida 宇宙割り勘 結果発表！\n合計: ¥${totalAmount.toLocaleString()}（${memberCount}人）\n${lines.join(
            "\n"
        )}\n#CosmicAmida #宇宙割り勘`;
    }, [finalResults, totalAmount, memberCount, maxPaid, minPaid]);

    const handleShareLine = () => {
        const url = `https://line.me/R/share?text=${encodeURIComponent(
            `${summaryText}\n${SITE_URL}`
        )}`;
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const handleShareX = () => {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
            summaryText
        )}&url=${encodeURIComponent(SITE_URL)}`;
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const handleCopySummary = async () => {
        try {
            await navigator.clipboard.writeText(`${summaryText}\n${SITE_URL}`);
            setCopiedSummary(true);
            setTimeout(() => setCopiedSummary(false), 2000);
        } catch {
            setCopiedSummary(false);
        }
    };

    const activeRevealStart =
        stage === "reveal" && finalResults[revealIdx]
            ? finalResults[revealIdx].startIndex
            : null;

    return (
        <div className="relative min-h-screen w-full text-slate-100 overflow-x-hidden">
            {/* 3D 宇宙背景 & あみだ柱 */}
            <WarikanScene3D
                ladder={stage === "select" || stage === "reveal" || stage === "summary" ? ladder : null}
                activeStartIndex={activeRevealStart}
                traceProgress={stage === "reveal" ? traceProgress : 0}
            />

            {/* ヘッダー */}
            <header className="relative z-20 flex items-center justify-between px-4 py-3 border-b border-blue-400/15 bg-slate-950/60 backdrop-blur-md">
                <Link
                    href="/"
                    className="text-sm sm:text-base font-extrabold tracking-wide text-blue-200 hover:text-white"
                >
                    ← ✨ Cosmic Amida
                </Link>
                <span className="rounded-full border border-amber-300/40 bg-amber-500/15 px-3 py-0.5 text-xs font-bold text-amber-200">
                    🍻 宇宙割り勘モード
                </span>
            </header>

            <main className="relative z-10 mx-auto max-w-xl px-4 py-6 pb-16">
                {/* ─── STEP 1: 設定画面 ─── */}
                {stage === "setup" && (
                    <section className="rounded-2xl border border-blue-300/25 bg-slate-950/80 p-5 sm:p-6 backdrop-blur-md shadow-2xl space-y-6">
                        <div className="space-y-1 text-center">
                            <h1 className="text-2xl sm:text-3xl font-black text-white">
                                🌌 宇宙割り勘あみだくじ
                            </h1>
                            <p className="text-xs sm:text-sm text-blue-200/80">
                                ただの飲み会の会計を、連打ゲーム＆宇宙規模の3Dあみだくじで決着！
                            </p>
                        </div>

                        {/* 人数 */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-blue-300">参加人数（2〜8人）</label>
                            <div className="grid grid-cols-7 gap-1.5">
                                {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => setMemberCount(n)}
                                        className={`rounded-lg py-2 text-sm font-bold transition-all ${
                                            memberCount === n
                                                ? "bg-blue-500 text-white shadow-lg scale-105"
                                                : "border border-blue-300/25 bg-slate-900/70 text-slate-300 hover:bg-blue-900/40"
                                        }`}
                                    >
                                        {n}人
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 合計金額 & 最大金額 */}
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label htmlFor="warikan-total" className="text-xs font-bold text-blue-300">
                                    合計金額（円）
                                </label>
                                <input
                                    id="warikan-total"
                                    type="number"
                                    min={0}
                                    step={100}
                                    value={totalAmountStr}
                                    onChange={(e) => setTotalAmountStr(e.target.value)}
                                    className="w-full rounded-xl border border-blue-300/30 bg-slate-900/80 px-3.5 py-2.5 text-lg font-extrabold text-white focus:border-blue-400 focus:outline-none"
                                />
                                <div className="flex flex-wrap gap-1.5">
                                    {[10000, 15000, 20000, 30000].map((v) => (
                                        <button
                                            key={v}
                                            type="button"
                                            onClick={() => setTotalAmountStr(String(v))}
                                            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-slate-800"
                                        >
                                            ¥{v.toLocaleString()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="warikan-max" className="text-xs font-bold text-amber-300">
                                    1人あたり最大金額（任意・上限）
                                </label>
                                <input
                                    id="warikan-max"
                                    type="number"
                                    min={0}
                                    step={500}
                                    value={maxAmountStr}
                                    onChange={(e) => setMaxAmountStr(e.target.value)}
                                    placeholder="空欄なら上限なし"
                                    className="w-full rounded-xl border border-amber-300/30 bg-slate-900/80 px-3.5 py-2.5 text-lg font-extrabold text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                                />
                                <p className="text-[11px] text-slate-400">
                                    均等平均: ¥{minRequiredCap.toLocaleString()} / 人
                                </p>
                                {isMaxTooLow && (
                                    <div className="flex items-center justify-between gap-2 rounded-lg border border-rose-400/50 bg-rose-950/60 px-2.5 py-1.5 text-[11px] text-rose-200">
                                        <span>最低 ¥{minRequiredCap.toLocaleString()} 以上必要です</span>
                                        <button
                                            type="button"
                                            onClick={() => setMaxAmountStr(String(minRequiredCap))}
                                            className="underline font-bold text-white shrink-0"
                                        >
                                            自動調整
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 分配パターン */}
                        <div className="space-y-2">
                            <span className="text-xs font-bold text-blue-300">割り勘の分配パターン</span>
                            <div className="grid gap-2">
                                {[
                                    {
                                        id: "equal" as const,
                                        title: "⚖️ 案1：均等（端数勝負）",
                                        desc: "100円単位でほぼ均等割り。端数だけあみだで決定",
                                    },
                                    {
                                        id: "one_free" as const,
                                        title: "🎉 案2：1人無料！あとは均等",
                                        desc: "ラッキーな1人が0円（タダ飯）、残りのメンバーで均等割り",
                                    },
                                    {
                                        id: "random_range" as const,
                                        title: "🎲 案3：プラマイ率ランダム",
                                        desc: "平均からの振れ幅（±%）を選んでスリル満点のランダム配分",
                                    },
                                ].map((opt) => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setPattern(opt.id)}
                                        className={`rounded-xl border p-3 text-left transition-all ${
                                            pattern === opt.id
                                                ? "border-blue-400 bg-blue-900/45 shadow-md"
                                                : "border-slate-700/70 bg-slate-900/60 hover:bg-slate-800/70"
                                        }`}
                                    >
                                        <div className="text-sm font-bold text-white">{opt.title}</div>
                                        <div className="text-xs text-slate-300 mt-0.5">{opt.desc}</div>
                                    </button>
                                ))}
                            </div>

                            {pattern === "random_range" && (
                                <div className="rounded-xl border border-indigo-400/30 bg-indigo-950/40 p-3 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-indigo-200">プラマイ振れ幅</span>
                                        <span className="font-extrabold text-amber-300">±{rangePercent}%</span>
                                    </div>
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {RANGE_OPTIONS.map((pct) => (
                                            <button
                                                key={pct}
                                                type="button"
                                                onClick={() => setRangePercent(pct)}
                                                className={`rounded-lg py-1.5 text-xs font-bold ${
                                                    rangePercent === pct
                                                        ? "bg-amber-400 text-slate-950"
                                                        : "bg-slate-900 text-slate-300 border border-slate-700"
                                                }`}
                                            >
                                                ±{pct}%
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 参加者名 */}
                        <div className="space-y-2">
                            <span className="text-xs font-bold text-blue-300">参加者の名前</span>
                            <div className="grid grid-cols-2 gap-2">
                                {Array.from({ length: memberCount }, (_, idx) => (
                                    <input
                                        key={`member-${idx}`}
                                        type="text"
                                        maxLength={12}
                                        value={memberNames[idx] ?? ""}
                                        aria-label={`参加者 ${idx + 1} の名前`}
                                        onChange={(e) => {
                                            const next = [...memberNames];
                                            next[idx] = e.target.value;
                                            setMemberNames(next);
                                        }}
                                        placeholder={`参加者${idx + 1}`}
                                        className="rounded-lg border border-blue-300/20 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none"
                                    />
                                ))}
                            </div>
                        </div>

                        {/* 開始ボタン */}
                        <div className="space-y-2.5 pt-2">
                            <button
                                type="button"
                                disabled={totalAmount <= 0 || isMaxTooLow}
                                onClick={handleStartMash}
                                className="w-full rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 py-3.5 text-base font-black text-white shadow-xl transition-transform hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                🔥 連打ゲームで順番を決める！
                            </button>
                            <button
                                type="button"
                                disabled={totalAmount <= 0 || isMaxTooLow}
                                onClick={handleSkipMash}
                                className="w-full rounded-xl border border-slate-600/80 bg-slate-900/60 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                            >
                                ⚡ 連打をスキップしてすぐ柱を選ぶ
                            </button>
                        </div>
                    </section>
                )}

                {/* ─── STEP 2: 連打ゲーム（順番決定） ─── */}
                {stage === "mash" && members[mashIndex] && (
                    <section className="rounded-2xl border border-blue-300/30 bg-slate-950/80 p-6 backdrop-blur-md shadow-2xl text-center space-y-6">
                        <div className="space-y-1">
                            <p className="text-xs font-bold tracking-widest text-blue-300">
                                順番決め連打ゲーム（{mashIndex + 1} / {members.length}人目）
                            </p>
                            <h2 className="text-2xl sm:text-3xl font-black text-white">
                                {members[mashIndex].name} の番！
                            </h2>
                            <p className="text-xs text-slate-300">
                                3秒間の連打数が多い人から、好きな柱を選べます！
                            </p>
                        </div>

                        <div className="text-5xl font-black tabular-nums text-amber-300">
                            {(mashRemainingMs / 1000).toFixed(2)}s
                        </div>

                        {mashState === "ready" && (
                            <button
                                type="button"
                                onClick={beginCurrentMashTurn}
                                className="w-full py-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-xl font-black text-white shadow-xl hover:scale-[1.02] active:scale-95 transition-transform"
                            >
                                🚀 用意…スタート！
                            </button>
                        )}

                        {mashState === "active" && (
                            <button
                                type="button"
                                onPointerDown={handleMashTap}
                                className="w-full h-44 rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 text-3xl font-black text-white shadow-[0_0_40px_rgba(255,165,0,0.6)] active:scale-95 transition-transform select-none touch-manipulation"
                            >
                                連打ァァァ！！
                                <div className="text-5xl mt-2 tabular-nums">{currentTaps}</div>
                            </button>
                        )}

                        {mashState === "done" && (
                            <div className="space-y-4">
                                <div className="rounded-xl border border-amber-300/40 bg-amber-500/15 py-4">
                                    <p className="text-xs text-amber-200">記録</p>
                                    <p className="text-4xl font-black text-white">{currentTaps} 回！</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleNextMashPlayer}
                                    className="w-full rounded-xl bg-blue-500 py-3.5 text-base font-black text-white hover:bg-blue-400"
                                >
                                    {mashIndex + 1 < members.length
                                        ? `次の人（${members[mashIndex + 1].name}）へ →`
                                        : "🏆 連打ランキングを見る →"}
                                </button>
                            </div>
                        )}
                    </section>
                )}

                {/* ─── STEP 2.5: 連打ランキング発表 ─── */}
                {stage === "mash_rank" && (
                    <section className="rounded-2xl border border-amber-300/35 bg-slate-950/85 p-6 backdrop-blur-md shadow-2xl space-y-5">
                        <div className="text-center space-y-1">
                            <h2 className="text-2xl font-black text-amber-300">
                                🏆 柱を選ぶ順番が決定！
                            </h2>
                            <p className="text-xs text-slate-300">
                                1位の人から順番に好きな柱を選べます
                            </p>
                        </div>

                        <ol className="space-y-2">
                            {members.map((m, idx) => (
                                <li
                                    key={m.id}
                                    className="flex items-center justify-between rounded-xl border border-blue-300/20 bg-slate-900/75 px-4 py-3"
                                >
                                    <span className="font-bold text-white">
                                        {idx + 1}位　{m.name}
                                    </span>
                                    <span className="font-mono text-sm font-bold text-amber-300">
                                        {m.mashScore} 回
                                    </span>
                                </li>
                            ))}
                        </ol>

                        <button
                            type="button"
                            onClick={() => setStage("select")}
                            className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 py-3.5 text-base font-black text-white shadow-xl"
                        >
                            🌌 宇宙あみだくじへ進む →
                        </button>
                    </section>
                )}

                {/* ─── STEP 3: 柱選択 ─── */}
                {stage === "select" && members[selectOrderIdx] && (
                    <section className="rounded-2xl border border-blue-300/30 bg-slate-950/70 p-5 backdrop-blur-md shadow-2xl space-y-5">
                        <div className="text-center space-y-1">
                            <p className="text-xs font-bold text-blue-300">
                                柱を選択（{selectOrderIdx + 1} / {members.length}人目）
                            </p>
                            <h2 className="text-2xl font-black text-white">
                                {members[selectOrderIdx].name} の柱を選んでください
                            </h2>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {Array.from({ length: memberCount }, (_, idx) => {
                                const assignedId = pillarAssignments[idx];
                                const assignedMember = members.find((m) => m.id === assignedId);
                                return (
                                    <button
                                        key={`pick-${idx}`}
                                        type="button"
                                        disabled={Boolean(assignedMember)}
                                        onClick={() => handleSelectPillar(idx)}
                                        className={`rounded-xl border py-4 px-2 text-center transition-all ${
                                            assignedMember
                                                ? "border-slate-700 bg-slate-900/70 text-slate-400 cursor-not-allowed"
                                                : "border-blue-400/60 bg-blue-950/65 text-white hover:bg-blue-700/60 hover:scale-105 shadow-lg"
                                        }`}
                                    >
                                        <div className="text-xs text-blue-300">▼ 柱 {idx + 1}</div>
                                        <div className="mt-1 font-extrabold truncate">
                                            {assignedMember ? assignedMember.name : "えらぶ"}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="border-t border-blue-400/20 pt-3 flex items-center justify-between text-xs">
                            <span className="text-slate-400">
                                合計: ¥{totalAmount.toLocaleString()}
                                {maxPerPerson ? `（上限 ¥${maxPerPerson.toLocaleString()}）` : ""}
                            </span>
                            <button
                                type="button"
                                onClick={() => setPeekGoals((v) => !v)}
                                className="text-blue-300 underline underline-offset-4"
                            >
                                {peekGoals ? "金額を隠す" : "金額ラインナップを見る"}
                            </button>
                        </div>

                        {peekGoals && (
                            <div className="flex flex-wrap gap-2 justify-center">
                                {[...goalAmounts]
                                    .sort((a, b) => a - b)
                                    .map((amt, i) => (
                                        <span
                                            key={i}
                                            className="rounded-full border border-amber-300/40 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-200"
                                        >
                                            ¥{amt.toLocaleString()}
                                        </span>
                                    ))}
                            </div>
                        )}
                    </section>
                )}

                {/* ─── STEP 4: 3D 降下＆1人ずつ結果発表 ─── */}
                {stage === "reveal" && finalResults[revealIdx] && (
                    <section className="mt-4 rounded-2xl border border-amber-300/40 bg-slate-950/75 p-6 backdrop-blur-md shadow-2xl text-center space-y-4">
                        <p className="text-xs font-bold tracking-widest text-blue-300">
                            宇宙運命判定（{revealIdx + 1} / {finalResults.length}）
                        </p>
                        <h2 className="text-2xl font-black text-white">
                            {finalResults[revealIdx].member.name} の支払額は…
                        </h2>

                        {traceProgress < 1 ? (
                            <div className="py-6 text-lg font-bold text-amber-200 animate-pulse">
                                ✨ 光の玉が宇宙あみだを降下中… ✨
                            </div>
                        ) : (
                            <div className="py-4 space-y-2">
                                <div className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-100 to-orange-400">
                                    ¥{finalResults[revealIdx].amount.toLocaleString()}
                                </div>
                                {finalResults[revealIdx].amount === 0 && (
                                    <p className="text-base font-extrabold text-emerald-300">
                                        🎉 奇跡のタダ飯確定！！ 🎉
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="flex flex-wrap justify-center gap-3 pt-2">
                            {traceProgress >= 1 && (
                                <button
                                    type="button"
                                    onClick={handleNextReveal}
                                    className="rounded-full bg-blue-500 px-6 py-2.5 text-sm font-black text-white shadow-lg hover:bg-blue-400"
                                >
                                    {revealIdx + 1 < finalResults.length
                                        ? "次の人を発表 →"
                                        : "📋 全員の精算表を見る →"}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleSkipToSummary}
                                className="rounded-full border border-slate-500/70 bg-slate-900/70 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800"
                            >
                                ⏭️ 全員の結果を一気に見る
                            </button>
                        </div>
                    </section>
                )}

                {/* ─── STEP 5: 精算結果ボード & シェア ─── */}
                {stage === "summary" && (
                    <section className="rounded-2xl border border-amber-300/40 bg-slate-950/85 p-5 sm:p-6 backdrop-blur-md shadow-2xl space-y-5">
                        <div className="text-center space-y-1">
                            <p className="text-xs font-bold tracking-widest text-amber-300">
                                COSMIC SETTLEMENT
                            </p>
                            <h2 className="text-2xl sm:text-3xl font-black text-white">
                                🌌 宇宙割り勘 精算表
                            </h2>
                            <p className="text-xs text-slate-300">
                                合計 ¥{totalAmount.toLocaleString()}（一致 ✓）
                                {maxPerPerson ? ` / 最大上限 ¥${maxPerPerson.toLocaleString()}` : ""}
                            </p>
                        </div>

                        {allocationWarning && (
                            <p className="rounded-lg border border-amber-400/40 bg-amber-950/50 px-3 py-2 text-xs text-amber-200">
                                ※ {allocationWarning}
                            </p>
                        )}

                        <ul className="space-y-2">
                            {finalResults.map((r) => {
                                const isFree = r.amount === 0;
                                const isTop = r.amount === maxPaid && maxPaid > minPaid;
                                return (
                                    <li
                                        key={r.member.id}
                                        className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                                            isFree
                                                ? "border-emerald-400/60 bg-emerald-950/45"
                                                : isTop
                                                ? "border-rose-400/60 bg-rose-950/40"
                                                : "border-blue-300/20 bg-slate-900/75"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-extrabold text-white">
                                                {r.member.name}
                                            </span>
                                            {isFree && (
                                                <span className="rounded-full bg-emerald-500/25 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                                                    🎉 タダ飯
                                                </span>
                                            )}
                                            {isTop && (
                                                <span className="rounded-full bg-rose-500/25 px-2 py-0.5 text-[10px] font-bold text-rose-200">
                                                    🔥 本日のMVP
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-lg font-black tabular-nums text-amber-200">
                                            ¥{r.amount.toLocaleString()}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>

                        <div className="flex flex-wrap justify-center gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={handleShareLine}
                                className="rounded-full bg-[#06C755] px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:brightness-110"
                            >
                                LINEで精算表を送る
                            </button>
                            <button
                                type="button"
                                onClick={handleShareX}
                                className="rounded-full border border-white/35 bg-black px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-neutral-800"
                            >
                                Xでシェア
                            </button>
                            <button
                                type="button"
                                onClick={handleCopySummary}
                                className="rounded-full border border-indigo-300/45 bg-indigo-950/70 px-4 py-2.5 text-sm font-bold text-indigo-100 hover:bg-indigo-900/70"
                            >
                                {copiedSummary ? "✓ コピー完了" : "🔗 精算表をコピー"}
                            </button>
                        </div>

                        <div className="flex gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={handleStartMash}
                                className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-black text-white hover:bg-blue-500"
                            >
                                🔄 同じメンバーでもう一回
                            </button>
                            <button
                                type="button"
                                onClick={() => setStage("setup")}
                                className="rounded-xl border border-slate-600 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800"
                            >
                                設定変更
                            </button>
                        </div>

                        <AdSlot className="pt-4" />
                    </section>
                )}
            </main>
        </div>
    );
}
