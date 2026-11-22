"use client";

/**
 * ResultOverlay.tsx
 *
 * 結果画面（HTML/CSS オーバーレイ）。phase === "result" のときのみ表示。
 * - 運勢に応じたジングル再生・canvas-confetti の紙吹雪
 * - 運勢テキスト（大吉など）のアニメーション表示
 * - 「もう一度」で reset() して selecting に戻る
 * - シェアボタンは現在無効（UIのみ）
 */

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { useGameStore } from "../../hooks/useGameStore";
import { getRandomMessage } from "../../lib/fortuneMessages";
import { AMIDA_CONFIG } from "../../lib/amidaConfig";
import { motion } from "framer-motion";
import { soundManager } from "../../lib/sound";

export default function ResultOverlay() {
    const reset = useGameStore((s) => s.reset);
    const finalResult = useGameStore((s) => s.finalResult);
    const messageRef = useRef(getRandomMessage());
    const { result } = AMIDA_CONFIG;

    useEffect(() => {
        // 結果画面の音を鳴らす（運勢に応じたジングル）
        soundManager.playResult(finalResult);

        // より明るいカラーパレット（紙吹雪をはっきり見せる）
        const brightRainbow = ['#FFFFFF', '#FFFF80', '#FFEB3B', '#FFD700', '#FFA500', '#FF69B4', '#00FFFF', '#98FB98', '#FF5252', '#7C4DFF', '#E040FB'];
        const combinedColors = [...new Set([...result.confettiColors, ...brightRainbow])];

        // 長く・明るく表示する共通オプション（ticks で表示時間延長、decay で減速を抑える、scalar で大きく）
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
        // 中央の大爆発（明るく・長く）
        fire(0.25, { spread: 60, startVelocity: 85 });
        fire(0.2, { spread: 100, startVelocity: 60 });
        fire(0.35, { spread: 140, startVelocity: 45 });
        fire(0.1, { spread: 180, startVelocity: 30 });
        fire(0.1, { spread: 220, startVelocity: 50 });

        // 左右からの追撃（同じく長く・明るく）
        setTimeout(() => {
            confetti({ ...longBrightOpts, origin: { x: 0, y: 1 }, spread: 80, angle: 45, particleCount: 150, startVelocity: 90 });
            confetti({ ...longBrightOpts, origin: { x: 1, y: 1 }, spread: 80, angle: 135, particleCount: 150, startVelocity: 90 });
        }, 400);

        setTimeout(() => {
            confetti({ ...longBrightOpts, origin: { x: 0.2, y: 1 }, spread: 80, angle: 60, particleCount: 150, startVelocity: 110 });
            confetti({ ...longBrightOpts, origin: { x: 0.8, y: 1 }, spread: 80, angle: 120, particleCount: 150, startVelocity: 110 });
        }, 800);
    }, [result.confettiColors, result.confettiCount, finalResult]);

    const handleShare = (e: React.MouseEvent) => {
        e.preventDefault();
        // Xポスト機能は無効化されました
    };

    const handleReset = () => {
        soundManager.resetBGMVolume();
        reset();
    };

    return (
        <div className="result-overlay" style={{ background: "rgba(0, 0, 10, 0.4)" }}>
            <motion.div
                className="result-content"
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
                    font-size: clamp(6rem, 25vw, 15rem);
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

                <div className="daikichi-wrapper">
                    <h1 className="daikichi-text" aria-live="polite">
                        {finalResult || "大吉"}
                    </h1>
                </div>

                <p
                    className="fortune-message mt-6 text-xl text-center text-blue-200 px-8 max-w-lg"
                    style={{ textShadow: "0 0 12px rgba(126,184,247,0.7)" }}
                >
                    {messageRef.current}
                </p>

                <div className="mt-10 flex gap-4">
                    <button
                        className="px-6 py-3 rounded-full border border-gray-600 text-gray-400 bg-gray-800/50
                       font-bold text-lg cursor-not-allowed opacity-50 flex items-center gap-2"
                        onClick={handleShare}
                        disabled
                        aria-label="X（旧Twitter）で結果をシェアする（無効）"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        ポストする
                    </button>
                    <button
                        className="px-6 py-3 rounded-full border border-blue-300 text-blue-200
                       font-bold text-lg hover:bg-blue-900/40 transition-all duration-200
                       hover:scale-105 focus-visible:outline focus-visible:outline-2
                       focus-visible:outline-blue-300"
                        onClick={handleReset}
                        aria-label="もう一度あみだくじをする"
                    >
                        🔄 もう一度
                    </button>
                </div>
            </motion.div>
        </div >
    );
}
