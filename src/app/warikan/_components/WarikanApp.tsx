"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import {
    applyRoundUpToFund,
    calculateWarikanAmounts,
    generateWarikanLadder,
    type RoundUpUnit,
    type WarikanLadder,
    type WarikanPattern,
} from "../../../lib/warikanLogic";
import { soundManager } from "../../../lib/sound";
import AdSlot from "../../_components/AdSlot";
import type { RevealSubPhase } from "./WarikanScene3D";

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
    const [useMaxCap, setUseMaxCap] = useState<boolean>(false);
    const [maxAmountStr, setMaxAmountStr] = useState<string>("8000");
    const [pattern, setPattern] = useState<WarikanPattern>("one_free");
    const [rangePercent, setRangePercent] = useState<number>(30);
    const [roundUpUnit, setRoundUpUnit] = useState<RoundUpUnit>(0);
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
    /** 下端のゴール金額をスタート時から表示する（デフォルトON：誰がどこを狙うか丸見え！） */
    const [showGoalAmounts, setShowGoalAmounts] = useState<boolean>(true);

    // ─── Reveal Animation State ───
    const [revealIdx, setRevealIdx] = useState<number>(0);
    const [traceProgress, setTraceProgress] = useState<number>(0);
    const [revealPhase, setRevealPhase] = useState<RevealSubPhase>("idle");
    const [impactFlashKey, setImpactFlashKey] = useState<number>(0);
    const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
    /** 泣きの1回（天丼判定用：前回の最高額メンバーIDと泣きの回数） */
    const [lastSponsorId, setLastSponsorId] = useState<number | null>(null);
    const [nakiCount, setNakiCount] = useState<number>(0);
    /** 西郷さん流「男気肩代わり（敬天愛人）」状態 */
    const [otokogiOpen, setOtokogiOpen] = useState<boolean>(false);
    const [otokogiHero, setOtokogiHero] = useState<{
        heroId: number;
        heroName: string;
        savedId: number;
        savedName: string;
    } | null>(null);
    const [showOtokogiBanner, setShowOtokogiBanner] = useState<boolean>(false);
    const [fundAmount, setFundAmount] = useState<number>(0);
    const [collectedTotal, setCollectedTotal] = useState<number>(0);

    const mashTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const revealRafRef = useRef<number | null>(null);

    const totalAmount = Math.max(0, parseInt(totalAmountStr.replace(/[^\d]/g, ""), 10) || 0);
    const parsedMax =
        useMaxCap && maxAmountStr.trim()
            ? parseInt(maxAmountStr.replace(/[^\d]/g, ""), 10)
            : null;
    const maxPerPerson =
        useMaxCap && parsedMax !== null && !Number.isNaN(parsedMax) && parsedMax > 0
            ? parsedMax
            : null;
    const minRequiredCap = memberCount > 0 ? Math.ceil(totalAmount / memberCount) : 0;
    const isMaxTooLow =
        useMaxCap &&
        (maxPerPerson === null || maxPerPerson * memberCount < totalAmount);

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
        const rounded = applyRoundUpToFund(alloc.amounts, roundUpUnit);
        const newLadder = generateWarikanLadder(memberCount);
        setGoalAmounts(rounded.roundedAmounts);
        setFundAmount(rounded.fundAmount);
        setCollectedTotal(rounded.collectedTotal);
        setAllocationWarning(alloc.warning);
        setLadder(newLadder);
        setPillarAssignments({});
        setSelectOrderIdx(0);
        setRevealIdx(0);
        setTraceProgress(0);
        setRevealPhase("idle");
        setOtokogiOpen(false);
        setOtokogiHero(null);
        setShowOtokogiBanner(false);
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

    // 精算の最大・最小金額（Reveal 演出分岐でも参照）
    const maxPaid = useMemo(
        () => Math.max(0, ...finalResults.map((r) => r.amount)),
        [finalResults]
    );
    const minPaid = useMemo(
        () => (finalResults.length > 0 ? Math.min(...finalResults.map((r) => r.amount)) : 0),
        [finalResults]
    );

    const currentSponsor = useMemo(
        () =>
            maxPaid > minPaid
                ? finalResults.find((r) => r.amount === maxPaid) ?? null
                : null,
        [finalResults, maxPaid, minPaid]
    );

    const isTendonSponsor =
        nakiCount > 0 &&
        lastSponsorId !== null &&
        currentSponsor !== null &&
        currentSponsor.member.id === lastSponsorId;

    // Reveal フェーズの4幕シネマティック 3D 降下アニメーション
    // 第1幕: ロックオンズーム(0.75s) → 第2幕: 火花降下(2.5s) → 第3幕: 寸止め超ズーム(0.9s) → 第4幕: 着弾インパクト(0.3s)
    useEffect(() => {
        if (stage !== "reveal" || finalResults.length === 0) return;

        const currentResult = finalResults[revealIdx];
        if (!currentResult) return;

        const lockonMs = 750;
        const descentMs = 2500;
        const holdMs = 900;
        const dropMs = 280;
        const totalMs = lockonMs + descentMs + holdMs + dropMs;

        const start = performance.now();
        let sweepPlayed = false;
        let holdSoundPlayed = false;
        let dropStarted = false;
        setRevealPhase("lockon");
        setTraceProgress(0.005);
        soundManager.playPon();

        const tick = (now: number) => {
            const elapsed = now - start;
            if (elapsed < lockonMs) {
                // lockon 中は state を再セットせず軽量に待機
                revealRafRef.current = requestAnimationFrame(tick);
            } else if (elapsed < lockonMs + descentMs) {
                if (!sweepPlayed) {
                    sweepPlayed = true;
                    setRevealPhase("descending");
                    soundManager.playBallSweep();
                }
                const p = (elapsed - lockonMs) / descentMs;
                setTraceProgress(Math.max(0.01, p * 0.88));
                revealRafRef.current = requestAnimationFrame(tick);
            } else if (elapsed < lockonMs + descentMs + holdMs) {
                if (!holdSoundPlayed) {
                    holdSoundPlayed = true;
                    setTraceProgress(0.88);
                    setRevealPhase("feint");
                    soundManager.playTensionHold();
                }
                revealRafRef.current = requestAnimationFrame(tick);
            } else if (elapsed < totalMs) {
                if (!dropStarted) {
                    dropStarted = true;
                    setRevealPhase("descending");
                }
                const dropT = (elapsed - lockonMs - descentMs - holdMs) / dropMs;
                setTraceProgress(0.88 + dropT * 0.12);
                revealRafRef.current = requestAnimationFrame(tick);
            } else {
                setRevealPhase("landed");
                setTraceProgress(1);
                setImpactFlashKey((k) => k + 1);
                if (currentResult.amount === 0) {
                    soundManager.playResult("大吉");
                    confetti({ particleCount: 110, spread: 95, origin: { y: 0.65 } });
                } else if (currentResult.amount === maxPaid && maxPaid > minPaid) {
                    soundManager.playZukkoke();
                } else {
                    soundManager.playBallCorner();
                }
            }
        };
        revealRafRef.current = requestAnimationFrame(tick);

        return () => {
            if (revealRafRef.current) cancelAnimationFrame(revealRafRef.current);
        };
    }, [stage, revealIdx, finalResults, maxPaid, minPaid]);

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
            setRevealPhase("lockon");
        } else {
            setRevealPhase("idle");
            setStage("summary");
            fireSummaryConfetti();
        }
    };

    const handleSkipToSummary = () => {
        if (revealRafRef.current) cancelAnimationFrame(revealRafRef.current);
        setRevealPhase("idle");
        setTraceProgress(1);
        setStage("summary");
        fireSummaryConfetti();
    };

    /** 最高額（スポンサー様）専用の「🔥 泣きの1回（全員再シャッフル）」 */
    const handleNakiRetry = () => {
        soundManager.playPon();
        setLastSponsorId(currentSponsor?.member.id ?? null);
        setNakiCount((c) => c + 1);
        prepareLadderAndAmounts();
        setStage("select");
    };

    /** 西郷さん流「⚔️ 男気立候補（敬天愛人・肩代わり）」 */
    const handleOtokogiTakeover = (heroMemberId: number) => {
        if (!currentSponsor || !ladder) return;
        const sponsorRes = finalResults.find((r) => r.member.id === currentSponsor.member.id);
        const heroRes = finalResults.find((r) => r.member.id === heroMemberId);
        if (!sponsorRes || !heroRes || sponsorRes.member.id === heroRes.member.id) return;

        // 2人のゴール金額をスワップ（勇者が最高額を引き受け、元のスポンサーを救出）
        const nextGoals = [...goalAmounts];
        const tmp = nextGoals[sponsorRes.goalIndex];
        nextGoals[sponsorRes.goalIndex] = nextGoals[heroRes.goalIndex];
        nextGoals[heroRes.goalIndex] = tmp;

        setGoalAmounts(nextGoals);
        setOtokogiOpen(false);
        setOtokogiHero({
            heroId: heroRes.member.id,
            heroName: heroRes.member.name,
            savedId: sponsorRes.member.id,
            savedName: sponsorRes.member.name,
        });
        setShowOtokogiBanner(true);

        soundManager.playResult("大吉");
        confetti({
            particleCount: 160,
            spread: 120,
            origin: { y: 0.55 },
            colors: ["#FFD700", "#FF4500", "#FFFFFF", "#FF8C00"],
        });
        setTimeout(() => setShowOtokogiBanner(false), 2400);
    };

    const summaryText = useMemo(() => {
        const lines = finalResults.map((r) => {
            const tag =
                otokogiHero && r.member.id === otokogiHero.heroId
                    ? " ⚔️男気ヒーロー（敬天愛人）"
                    : r.amount === 0
                    ? " 🎉タダ飯！"
                    : r.amount === maxPaid && maxPaid > minPaid
                    ? " 👑今夜のスポンサー様"
                    : "";
            return `・${r.member.name}: ¥${r.amount.toLocaleString()}${tag}`;
        });
        const otokogiLine = otokogiHero
            ? `\n⚔️ 男気認定！${otokogiHero.heroName} が ${otokogiHero.savedName} の最高額を肩代わり！（敬天愛人）`
            : "";
        const fundLine =
            fundAmount > 0
                ? `\n💰 2次会・アイス軍資金: ¥${fundAmount.toLocaleString()}（${roundUpUnit}円単位切り上げ）`
                : "";
        const tendonLine = isTendonSponsor
            ? `\n😂 泣きの${nakiCount}回目で天丼達成！またしても ${currentSponsor?.member.name} がスポンサー様！`
            : "";
        return `🌌 Cosmic Amida 宇宙割り勘 結果発表！\n合計: ¥${totalAmount.toLocaleString()}（${memberCount}人）\n${lines.join(
            "\n"
        )}${otokogiLine}${fundLine}${tendonLine}\n#CosmicAmida #宇宙割り勘`;
    }, [
        finalResults,
        totalAmount,
        memberCount,
        maxPaid,
        minPaid,
        otokogiHero,
        fundAmount,
        roundUpUnit,
        isTendonSponsor,
        nakiCount,
        currentSponsor,
    ]);

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

    // 各柱の上端に表示する参加者名一覧
    const pillarNames = useMemo(
        () =>
            Array.from({ length: memberCount }, (_, idx) => {
                const mId = pillarAssignments[idx];
                if (mId === undefined) return null;
                return members.find((m) => m.id === mId)?.name ?? null;
            }),
        [memberCount, pillarAssignments, members]
    );

    // 到達済み（公開済み）のゴールインデックス一覧
    const revealedGoalIndices = useMemo(() => {
        if (stage === "summary") {
            return Array.from({ length: memberCount }, (_, i) => i);
        }
        if (stage !== "reveal") return [];
        const indices: number[] = [];
        for (let i = 0; i < finalResults.length; i++) {
            if (i < revealIdx || (i === revealIdx && traceProgress >= 1)) {
                indices.push(finalResults[i].goalIndex);
            }
        }
        return indices;
    }, [stage, memberCount, finalResults, revealIdx, traceProgress]);

    return (
        <div className="relative min-h-screen w-full text-slate-100 overflow-x-hidden">
            {/* 3D 宇宙背景 & 火花を吹くあみだ柱 */}
            <WarikanScene3D
                ladder={stage === "select" || stage === "reveal" || stage === "summary" ? ladder : null}
                activeStartIndex={activeRevealStart}
                traceProgress={stage === "reveal" ? traceProgress : 0}
                revealPhase={stage === "reveal" ? revealPhase : "idle"}
                pillarNames={pillarNames}
                goalAmounts={goalAmounts}
                showGoalAmounts={showGoalAmounts}
                revealedGoalIndices={revealedGoalIndices}
            />

            {/* 着弾インパクトのホワイトフラッシュ */}
            {impactFlashKey > 0 && stage === "reveal" && revealPhase === "landed" && (
                <div
                    key={impactFlashKey}
                    className="warikan-impact-flash fixed inset-0 z-40 bg-white pointer-events-none"
                />
            )}

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

                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-amber-300">
                                        1人あたり最大金額
                                    </span>
                                    <div className="inline-flex rounded-lg border border-amber-300/30 bg-slate-900/90 p-0.5 text-[11px] font-bold">
                                        <button
                                            type="button"
                                            onClick={() => setUseMaxCap(false)}
                                            aria-pressed={!useMaxCap}
                                            className={`rounded-md px-2.5 py-1 transition-colors ${
                                                !useMaxCap
                                                    ? "bg-slate-700 text-white"
                                                    : "text-slate-400 hover:text-white"
                                            }`}
                                        >
                                            設定なし
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setUseMaxCap(true);
                                                if (!maxAmountStr.trim() || (parseInt(maxAmountStr, 10) || 0) < minRequiredCap) {
                                                    const suggested = Math.ceil((minRequiredCap * 1.4) / 500) * 500;
                                                    setMaxAmountStr(String(Math.max(minRequiredCap, suggested)));
                                                }
                                            }}
                                            aria-pressed={useMaxCap}
                                            className={`rounded-md px-2.5 py-1 transition-colors ${
                                                useMaxCap
                                                    ? "bg-amber-400 text-slate-950"
                                                    : "text-slate-400 hover:text-white"
                                            }`}
                                        >
                                            設定あり
                                        </button>
                                    </div>
                                </div>

                                {useMaxCap ? (
                                    <div className="space-y-1.5">
                                        <input
                                            id="warikan-max"
                                            type="number"
                                            min={minRequiredCap}
                                            step={500}
                                            value={maxAmountStr}
                                            onChange={(e) => setMaxAmountStr(e.target.value)}
                                            aria-label="1人あたり最大金額（円）"
                                            className="w-full rounded-xl border border-amber-300/40 bg-slate-900/80 px-3.5 py-2.5 text-lg font-extrabold text-white focus:border-amber-400 focus:outline-none"
                                        />
                                        <div className="flex flex-wrap gap-1.5">
                                            {[1000, 2000, 3000].map((plus) => {
                                                const v = Math.ceil((minRequiredCap + plus) / 100) * 100;
                                                return (
                                                    <button
                                                        key={plus}
                                                        type="button"
                                                        onClick={() => setMaxAmountStr(String(v))}
                                                        className="rounded-md border border-amber-300/25 bg-amber-950/40 px-2 py-0.5 text-[11px] text-amber-200 hover:bg-amber-900/50"
                                                    >
                                                        平均+{plus.toLocaleString()} (¥{v.toLocaleString()})
                                                    </button>
                                                );
                                            })}
                                        </div>
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
                                ) : (
                                    <div className="rounded-xl border border-slate-700/70 bg-slate-900/50 px-3.5 py-3 text-xs text-slate-400">
                                        上限なし（均等平均: ¥{minRequiredCap.toLocaleString()} / 人）
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

                        {/* 2次会軍資金（切り上げ精算） */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-emerald-300">
                                    🍶 2次会軍資金（小銭なし切り上げ精算）
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { unit: 0 as const, label: "なし（ピッタリ）" },
                                    { unit: 500 as const, label: "500円単位" },
                                    { unit: 1000 as const, label: "1,000円単位" },
                                ].map((opt) => (
                                    <button
                                        key={opt.unit}
                                        type="button"
                                        onClick={() => setRoundUpUnit(opt.unit)}
                                        className={`rounded-lg py-2 text-xs font-bold transition-colors ${
                                            roundUpUnit === opt.unit
                                                ? "bg-emerald-500 text-slate-950 shadow"
                                                : "border border-slate-700 bg-slate-900/70 text-slate-300 hover:bg-slate-800"
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            {roundUpUnit > 0 && (
                                <p className="text-[11px] text-emerald-200/85">
                                    ※ 0円（タダ飯）はそのまま守り、他メンバーを {roundUpUnit.toLocaleString()}円単位で切り上げた余りを「2次会・アイス軍資金」にします。
                                </p>
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

                {/* ─── STEP 3: 柱選択（中央の3Dあみだ全体：上端の名前〜下端の金額が丸見え！） ─── */}
                {stage === "select" && members[selectOrderIdx] && (
                    <>
                        {/* 上部スリムバー */}
                        <motion.div
                            initial={{ opacity: 0, y: -12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            className="fixed top-14 left-1/2 -translate-x-1/2 z-[200] w-[94%] max-w-xl rounded-2xl border border-blue-300/40 bg-slate-950/75 px-4 py-2.5 backdrop-blur-md shadow-xl flex flex-wrap items-center justify-between gap-2"
                        >
                            <div>
                                <p className="text-[11px] font-bold text-blue-300">
                                    柱を選択（{selectOrderIdx + 1} / {members.length}人目）
                                </p>
                                <h2 className="text-base sm:text-lg font-black text-white">
                                    {members[selectOrderIdx].name} の柱を選んでください
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowGoalAmounts((v) => !v)}
                                className="hover-spring rounded-full border border-amber-300/40 bg-amber-950/50 px-3 py-1 text-[11px] font-bold text-amber-200"
                            >
                                {showGoalAmounts ? "🙈 金額を隠す" : "👀 金額を見る"}
                            </button>
                        </motion.div>

                        {/* 下部スリム柱ボタンバー（3D全体の上端・下端を絶対に隠さない） */}
                        <motion.div
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] w-[95%] max-w-2xl rounded-2xl border border-blue-300/35 bg-slate-950/80 p-3 backdrop-blur-md shadow-2xl"
                        >
                            <div
                                className="grid gap-1.5"
                                style={{
                                    gridTemplateColumns: `repeat(${Math.min(memberCount, 4)}, minmax(0, 1fr))`,
                                }}
                            >
                                {Array.from({ length: memberCount }, (_, idx) => {
                                    const assignedId = pillarAssignments[idx];
                                    const assignedMember = members.find((m) => m.id === assignedId);
                                    return (
                                        <button
                                            key={`pick-${idx}`}
                                            type="button"
                                            disabled={Boolean(assignedMember)}
                                            onClick={() => handleSelectPillar(idx)}
                                            className={`hover-spring rounded-xl border py-2 px-2 text-center ${
                                                assignedMember
                                                    ? "border-slate-700 bg-slate-900/70 text-slate-400 cursor-not-allowed"
                                                    : "border-blue-400/70 bg-blue-950/75 text-white hover:bg-blue-700/70 shadow-md"
                                            }`}
                                        >
                                            <div className="text-[10px] font-bold text-blue-300">
                                                ▼ 柱 {idx + 1}
                                            </div>
                                            <div className="text-xs sm:text-sm font-extrabold truncate">
                                                {assignedMember ? assignedMember.name : "えらぶ"}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </>
                )}

                {/* ─── STEP 4: 4幕ドラマティック 3D 火花降下＆結果発表 ─── */}
                {stage === "reveal" && finalResults[revealIdx] && (
                    <>
                        {revealPhase !== "landed" ? (
                            <div key="descending-hud">
                                <motion.div
                                    key={revealPhase}
                                    initial={{ opacity: 0, y: -14, scale: 0.92 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ duration: 0.45, ease: [0.34, 1.45, 0.64, 1] }}
                                    className="fixed top-16 left-1/2 -translate-x-1/2 z-[200] w-[92%] max-w-md rounded-full border border-amber-300/60 bg-slate-950/75 px-5 py-2.5 text-center backdrop-blur-md shadow-xl"
                                >
                                    {revealPhase === "lockon" ? (
                                        <p className="text-sm sm:text-base font-black text-blue-200">
                                            🎯 {finalResults[revealIdx].member.name} にロックオン！運命スタート！
                                        </p>
                                    ) : revealPhase === "feint" ? (
                                        <p className="text-base sm:text-lg font-black text-amber-300">
                                            ⚡ ……おっ！？ ちょっと待て！！
                                        </p>
                                    ) : (
                                        <p className="text-sm sm:text-base font-extrabold text-white">
                                            🔥 {finalResults[revealIdx].member.name} の光の玉が火花を吹いて降下中…（{revealIdx + 1}/{finalResults.length}）
                                        </p>
                                    )}
                                </motion.div>

                                <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[200]">
                                    <button
                                        type="button"
                                        onClick={handleSkipToSummary}
                                        className="rounded-full border border-slate-400/60 bg-slate-950/85 px-5 py-2 text-xs font-bold text-slate-200 backdrop-blur-md hover:bg-slate-800 shadow-lg"
                                    >
                                        ⏭️ 全員の結果を一気に見る
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* 第4幕：ゴール着弾後（transitions.dev イージングで下寄りから滑らか＆バウンシー登場） */
                            <motion.section
                                key={`landed-${revealIdx}`}
                                initial={{ opacity: 0, y: 28, filter: "blur(3px)" }}
                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[200] w-[92%] max-w-md rounded-2xl border border-amber-300/60 bg-slate-950/88 p-5 backdrop-blur-md shadow-[0_0_50px_rgba(251,191,36,0.35)] text-center space-y-3"
                            >
                                <p className="text-xs font-bold tracking-widest text-blue-300">
                                    宇宙運命判定（{revealIdx + 1} / {finalResults.length}）
                                </p>
                                <h2 className="text-xl font-black text-white">
                                    {finalResults[revealIdx].member.name} の支払額は…
                                </h2>

                                <motion.div
                                    initial={{ scale: 0.55, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.5, ease: [0.34, 1.45, 0.64, 1] }}
                                    className="py-1 space-y-1"
                                >
                                    <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-100 to-orange-400">
                                        ¥{finalResults[revealIdx].amount.toLocaleString()}
                                    </div>
                                    {finalResults[revealIdx].amount === 0 && (
                                        <p className="text-sm font-extrabold text-emerald-300">
                                            🎉 奇跡のタダ飯確定！！ 🎉
                                        </p>
                                    )}
                                    {finalResults[revealIdx].amount === maxPaid && maxPaid > minPaid && (
                                        <div className="space-y-0.5">
                                            <p className="text-sm font-extrabold text-rose-300">
                                                👑 今夜のスポンサー様 決定！！（ズコーッ！）
                                            </p>
                                            <p className="text-[11px] text-amber-200/90">
                                                特権：次の店・乾杯の音頭の決定権を獲得！
                                            </p>
                                        </div>
                                    )}
                                </motion.div>

                                <div className="flex flex-wrap justify-center gap-2.5 pt-1">
                                    <button
                                        type="button"
                                        onClick={handleNextReveal}
                                        className="hover-spring rounded-full bg-blue-500 px-6 py-2.5 text-sm font-black text-white shadow-lg hover:bg-blue-400"
                                    >
                                        {revealIdx + 1 < finalResults.length
                                            ? "次の人を発表 →"
                                            : "📋 全員の精算表を見る →"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSkipToSummary}
                                        className="hover-spring rounded-full border border-slate-500/70 bg-slate-900/70 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800"
                                    >
                                        ⏭️ 全員の結果を一気に見る
                                    </button>
                                </div>
                            </motion.section>
                        )}
                    </>
                )}

                {/* ─── STEP 5: 精算結果ボード & シェア ─── */}
                {stage === "summary" && (
                    <motion.section
                        initial={{ opacity: 0, y: 24, filter: "blur(3px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="rounded-2xl border border-amber-300/40 bg-slate-950/85 p-5 sm:p-6 backdrop-blur-md shadow-2xl space-y-5"
                    >
                        <div className="text-center space-y-1">
                            <p className="text-xs font-bold tracking-widest text-amber-300">
                                COSMIC SETTLEMENT
                            </p>
                            <h2 className="text-2xl sm:text-3xl font-black text-white">
                                🌌 宇宙割り勘 精算表
                            </h2>
                            <p className="text-xs text-slate-300">
                                会計 ¥{totalAmount.toLocaleString()}
                                {fundAmount > 0
                                    ? ` / 集金 ¥${collectedTotal.toLocaleString()}（軍資金 +¥${fundAmount.toLocaleString()}）`
                                    : "（一致 ✓）"}
                                {maxPerPerson ? ` / 上限 ¥${maxPerPerson.toLocaleString()}` : ""}
                            </p>
                        </div>

                        {fundAmount > 0 && (
                            <div className="rounded-xl border border-emerald-400/55 bg-emerald-950/50 px-4 py-3 text-center space-y-0.5">
                                <p className="text-xs font-bold text-emerald-300">
                                    🍶 切り上げ精算（小銭やり取りゼロ！）
                                </p>
                                <p className="text-lg font-black text-white">
                                    💰 2次会・アイス軍資金：¥{fundAmount.toLocaleString()}
                                </p>
                            </div>
                        )}

                        {otokogiHero && (
                            <div className="rounded-xl border border-amber-400/70 bg-gradient-to-r from-amber-950/70 via-red-950/60 to-amber-950/70 px-4 py-3 text-center space-y-0.5">
                                <p className="text-sm font-black text-amber-200">
                                    ⚔️ 男気認定！！（敬天愛人）
                                </p>
                                <p className="text-xs text-amber-100">
                                    <strong>{otokogiHero.heroName}</strong> が{" "}
                                    <strong>{otokogiHero.savedName}</strong> の最高額を男気で肩代わりしました！
                                </p>
                            </div>
                        )}

                        {isTendonSponsor && currentSponsor && (
                            <div className="rounded-xl border border-rose-400/70 bg-rose-950/60 p-3 text-center space-y-0.5 animate-bounce">
                                <p className="text-sm font-black text-amber-200">
                                    😂 天丼達成！！（泣きの{nakiCount}回目）
                                </p>
                                <p className="text-xs text-rose-100">
                                    またしても {currentSponsor.member.name} が「今夜のスポンサー様」に降臨！！
                                </p>
                            </div>
                        )}

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
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-extrabold text-white">
                                                {r.member.name}
                                            </span>
                                            {otokogiHero && r.member.id === otokogiHero.heroId && (
                                                <span className="rounded-full bg-amber-400/30 border border-amber-300/60 px-2 py-0.5 text-[10px] font-black text-amber-200">
                                                    ⚔️ 男気ヒーロー
                                                </span>
                                            )}
                                            {otokogiHero && r.member.id === otokogiHero.savedId && (
                                                <span className="rounded-full bg-sky-500/25 px-2 py-0.5 text-[10px] font-bold text-sky-200">
                                                    🙏 救出された人
                                                </span>
                                            )}
                                            {isFree && (
                                                <span className="rounded-full bg-emerald-500/25 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                                                    🎉 タダ飯
                                                </span>
                                            )}
                                            {isTop && (!otokogiHero || r.member.id !== otokogiHero.heroId) && (
                                                <span className="rounded-full bg-amber-400/25 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                                                    👑 今夜のスポンサー様
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

                        {currentSponsor && (
                            <div className="space-y-2.5">
                                <div className="rounded-xl border border-amber-400/35 bg-gradient-to-r from-rose-950/50 via-amber-950/40 to-rose-950/50 p-3.5 text-center space-y-2">
                                    <p className="text-xs text-amber-100">
                                        👑 <strong>{currentSponsor.member.name}</strong> 専用ボタン（逆転なるか、天丼か…！）
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleNakiRetry}
                                        className="w-full rounded-xl bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 py-2.5 text-sm font-black text-white shadow-lg hover:brightness-110 active:scale-95 transition-all"
                                    >
                                        🔥 泣きの1回！（全員シャッフルで再勝負）
                                    </button>
                                </div>

                                {/* 西郷さん流：男気立候補（敬天愛人・肩代わり） */}
                                <div className="rounded-xl border border-amber-300/40 bg-slate-900/80 p-3.5 text-center space-y-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setOtokogiOpen((v) => !v)}
                                        className="w-full rounded-xl border border-amber-400/60 bg-gradient-to-r from-amber-600/30 to-red-600/30 py-2.5 text-sm font-black text-amber-200 hover:bg-amber-600/40 transition-colors"
                                    >
                                        ⚔️ 男気立候補（誰かが {currentSponsor.member.name} を救う！）
                                    </button>
                                    {otokogiOpen && (
                                        <div className="space-y-2 pt-1">
                                            <p className="text-[11px] text-amber-100/90">
                                                「おいは構わん！最高額は俺が引き受ける！」という勇者を選んでください：
                                            </p>
                                            <div className="flex flex-wrap justify-center gap-2">
                                                {finalResults
                                                    .filter((r) => r.member.id !== currentSponsor.member.id)
                                                    .map((cand) => (
                                                        <button
                                                            key={cand.member.id}
                                                            type="button"
                                                            onClick={() => handleOtokogiTakeover(cand.member.id)}
                                                            className="rounded-full border border-amber-300/60 bg-amber-500/20 px-4 py-1.5 text-xs font-extrabold text-white hover:bg-amber-500/45 transition-colors"
                                                        >
                                                            ⚔️ {cand.member.name} が肩代わり
                                                        </button>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

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
                    </motion.section>
                )}
                {/* 西郷さん流：男気認定オーバーレイ演出 */}
                {showOtokogiBanner && otokogiHero && (
                    <div
                        role="status"
                        aria-live="assertive"
                        className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm pointer-events-none"
                    >
                        <div className="rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-red-950/95 via-slate-950/95 to-amber-950/95 px-8 py-10 text-center shadow-[0_0_80px_rgba(251,191,36,0.6)] space-y-3 animate-bounce">
                            <p className="text-xs font-bold tracking-[0.4em] text-amber-300">
                                敬 天 愛 人
                            </p>
                            <p className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-amber-300 to-orange-500">
                                ⚔️ 男気認定！！
                            </p>
                            <p className="text-base sm:text-lg font-extrabold text-white">
                                {otokogiHero.heroName} が {otokogiHero.savedName} を救出！！
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
