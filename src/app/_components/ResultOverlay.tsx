"use client";

/**
 * ResultOverlay.tsx
 *
 * 結果画面（HTML/CSS オーバーレイ）。phase === "result" のときのみ表示。
 * - 運勢に応じたジングル再生・canvas-confetti の紙吹雪
 * - 運勢テキスト（大吉など）のアニメーション表示
 * - X / LINE / URLコピーによるSNSシェア導線
 * - 「もう一度」で reset() して selecting に戻る
 */

import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { useGameStore } from "../../hooks/useGameStore";
import { getRandomMessage } from "../../lib/fortuneMessages";
import { AMIDA_CONFIG } from "../../lib/amidaConfig";
import { motion } from "framer-motion";
import { soundManager } from "../../lib/sound";
import AdSlot from "./AdSlot";

const SITE_URL = "https://cosmic-amida.pages.dev";

export default function ResultOverlay() {
    const reset = useGameStore((s) => s.reset);
    const finalResult = useGameStore((s) => s.finalResult);
    const selectedPillar = useGameStore((s) => s.selectedPillar);
    const customTitle = useGameStore((s) => s.customTitle);
    const customParticipants = useGameStore((s) => s.customParticipants);
    const messageRef = useRef(getRandomMessage());
    const [copied, setCopied] = useState(false);
    const { result } = AMIDA_CONFIG;

    useEffect(() => {
        // 結果画面の音を鳴らす（運勢に応じたジングル）
        soundManager.playResult(finalResult);

        // より明るいカラーパレット（紙吹雪をはっきり見せる）
        const brightRainbow = [
            "#FFFFFF",
            "#FFFF80",
            "#FFEB3B",
            "#FFD700",
            "#FFA500",
            "#FF69B4",
            "#00FFFF",
            "#98FB98",
            "#FF5252",
            "#7C4DFF",
            "#E040FB",
        ];
        const combinedColors = [...new Set([...result.confettiColors, ...brightRainbow])];

        // 長く・明るく表示する共通オプション
        const longBrightOpts: confetti.Options = {
            colors: combinedColors,
            decay: 0.97,
            gravity: 0.5,
            scalar: 1.3,
            ticks: 450,
        };

        // 紙吹雪を中央から激しく発射
        const fire = (particleRatio: number, opts: confetti.Options) => {
            confetti({
                ...longBrightOpts,
                ...opts,
                origin: { y: 0.6 },
                particleCount: Math.floor(result.confettiCount * particleRatio * 3),
            });
        };

        soundManager.playConfettiShimmer();
        fire(0.25, { spread: 60, startVelocity: 85 });
        fire(0.2, { spread: 100, startVelocity: 60 });
        fire(0.35, { spread: 140, startVelocity: 45 });
        fire(0.1, { spread: 180, startVelocity: 30 });
        fire(0.1, { spread: 220, startVelocity: 50 });

        const timer1 = setTimeout(() => {
            confetti({
                ...longBrightOpts,
                origin: { x: 0, y: 1 },
                spread: 80,
                angle: 45,
                particleCount: 150,
                startVelocity: 90,
            });
            confetti({
                ...longBrightOpts,
                origin: { x: 1, y: 1 },
                spread: 80,
                angle: 135,
                particleCount: 150,
                startVelocity: 90,
            });
        }, 400);

        const timer2 = setTimeout(() => {
            confetti({
                ...longBrightOpts,
                origin: { x: 0.2, y: 1 },
                spread: 80,
                angle: 60,
                particleCount: 150,
                startVelocity: 110,
            });
            confetti({
                ...longBrightOpts,
                origin: { x: 0.8, y: 1 },
                spread: 80,
                angle: 120,
                particleCount: 150,
                startVelocity: 110,
            });
        }, 800);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, [result.confettiColors, result.confettiCount, finalResult]);

    const fortuneLabel = finalResult || "大吉";
    const participantName =
        selectedPillar !== null && customParticipants?.[selectedPillar]
            ? customParticipants[selectedPillar]
            : null;
    const shareUrl =
        typeof window !== "undefined" && window.location.href.startsWith("http")
            ? window.location.href
            : SITE_URL;
    const shareText = customTitle || participantName
        ? `✨ ${customTitle ? `「${customTitle}」` : "Cosmic Amida"} で${
              participantName ? `${participantName}の結果は` : "あみだくじを引いたら"
          }【${fortuneLabel}】でした！\n#CosmicAmida #宇宙あみだくじ`
        : `✨ Cosmic Amida で宇宙あみだくじを引いたら【${fortuneLabel}】でした！\n「${messageRef.current}」\n#CosmicAmida #宇宙あみだくじ`;

    const handleShareX = () => {
        const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
            shareText
        )}&url=${encodeURIComponent(shareUrl)}`;
        window.open(intentUrl, "_blank", "noopener,noreferrer");
    };

    const handleShareLine = () => {
        const lineUrl = `https://line.me/R/share?text=${encodeURIComponent(
            `${shareText}\n${shareUrl}`
        )}`;
        window.open(lineUrl, "_blank", "noopener,noreferrer");
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // クリップボードAPI非対応環境向けのフォールバック
            setCopied(false);
        }
    };

    const handleReset = () => {
        soundManager.resetBGMVolume();
        reset();
    };

    return (
        <div className="result-overlay" style={{ background: "rgba(0, 0, 10, 0.4)" }}>
            <motion.div
                className="result-content flex flex-col items-center px-4"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            >
                <style>{`
                @keyframes daikichi-spin {
                    0% { transform: scale(0.3) rotate(-20deg); opacity: 0; }
                    60% { transform: scale(1.15) rotate(5deg); opacity: 1; }
                    80% { transform: scale(0.95) rotate(-2deg); }
                    100% { transform: scale(1) rotate(0deg); opacity: 1; }
                }
                @keyframes message-fadein {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes shine {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes cosmic-shockwave {
                    0% { transform: scale(0); opacity: 1; }
                    100% { transform: scale(4); opacity: 0; }
                }
                @keyframes sparkle-glow {
                    0%, 100% { filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.6)) drop-shadow(0 0 30px rgba(255, 140, 0, 0.4)); }
                    50% { filter: drop-shadow(0 0 30px rgba(255, 215, 0, 1)) drop-shadow(0 0 60px rgba(255, 255, 255, 0.9)) drop-shadow(0 0 90px rgba(255, 255, 255, 0.6)); }
                }
                .shockwave {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 300px;
                    height: 300px;
                    margin-top: -150px;
                    margin-left: -150px;
                    border-radius: 50%;
                    border: 2px solid rgba(135, 206, 250, 0.8);
                    box-shadow: 0 0 20px rgba(135, 206, 250, 0.5), inset 0 0 20px rgba(135, 206, 250, 0.5);
                    animation: cosmic-shockwave 1.2s ease-out forwards;
                    pointer-events: none;
                }
                .daikichi-wrapper {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    width: 100%;
                    animation: sparkle-glow 1.5s ease-in-out infinite alternate;
                }
                .daikichi-text {
                    font-size: clamp(5rem, 22vw, 14rem);
                    font-weight: 900;
                    background: linear-gradient(135deg, #FFD700 0%, #FF8C00 30%, #ffffff 45%, #FFFDE7 50%, #ffffff 55%, #FF8C00 70%, #FFD700 100%);
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    animation: daikichi-spin 0.8s cubic-bezier(.36,.07,.19,.97) forwards, shine 2.5s linear infinite;
                    letter-spacing: 0.05em;
                    line-height: 1.2;
                    padding: 10px;
                    position: relative;
                    z-index: 10;
                    margin: 0;
                    text-align: center;
                }
                .fortune-message {
                    animation: message-fadein 0.6s ease 0.5s forwards;
                    opacity: 0;
                    position: relative;
                    font-weight: bold;
                }
      `}</style>

                {/* Cosmic Shockwave */}
                <div className="shockwave"></div>

                {(customTitle || participantName) && (
                    <p className="mb-1 rounded-full border border-blue-300/40 bg-slate-950/60 px-4 py-1 text-sm font-bold text-blue-200">
                        {customTitle ? `${customTitle}：` : ""}
                        {participantName ? `${participantName} の結果` : "結果発表"}
                    </p>
                )}

                <div className="daikichi-wrapper">
                    <h1 className="daikichi-text" aria-live="polite">
                        {fortuneLabel}
                    </h1>
                </div>

                <p
                    className="fortune-message mt-4 text-lg sm:text-xl text-center text-blue-200 px-6 max-w-lg"
                    style={{ textShadow: "0 0 12px rgba(126,184,247,0.7)" }}
                >
                    {messageRef.current}
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <button
                        type="button"
                        className="px-5 py-2.5 rounded-full border border-white/40 text-white bg-black/75
                       font-bold text-base hover:bg-neutral-800 transition-all duration-200
                       hover:scale-105 flex items-center gap-2 shadow-lg"
                        onClick={handleShareX}
                        aria-label="X（旧Twitter）で結果をシェアする"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        Xでシェア
                    </button>

                    <button
                        type="button"
                        className="px-5 py-2.5 rounded-full border border-emerald-400/60 text-white bg-[#06C755]/90
                       font-bold text-base hover:bg-[#06C755] transition-all duration-200
                       hover:scale-105 flex items-center gap-2 shadow-lg"
                        onClick={handleShareLine}
                        aria-label="LINEで結果をシェアする"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                        </svg>
                        LINEで送る
                    </button>

                    <button
                        type="button"
                        className="px-4 py-2.5 rounded-full border border-indigo-300/50 text-indigo-100 bg-indigo-950/60
                       font-bold text-base hover:bg-indigo-900/60 transition-all duration-200
                       hover:scale-105 shadow-lg"
                        onClick={handleCopyLink}
                        aria-label="結果とURLをコピーする"
                    >
                        {copied ? "✓ コピーしました" : "🔗 結果をコピー"}
                    </button>
                </div>

                <div className="mt-5">
                    <button
                        type="button"
                        className="px-7 py-3 rounded-full border border-blue-300 text-blue-100 bg-blue-950/50
                       font-bold text-lg hover:bg-blue-900/60 transition-all duration-200
                       hover:scale-105 focus-visible:outline focus-visible:outline-2
                       focus-visible:outline-blue-300 shadow-lg"
                        onClick={handleReset}
                        aria-label="もう一度あみだくじをする"
                    >
                        🔄 もう一度
                    </button>
                </div>

                {/* 広告スロット（誤タップ防止のためボタン群の下に十分な余白を取って配置） */}
                <AdSlot className="mt-8" />
            </motion.div>
        </div>
    );
}
