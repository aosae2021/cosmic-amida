"use client";

/**
 * CountdownOverlay.tsx
 *
 * エナジーチャージのゲージUI。phase === "countdown" のときのみ表示。
 * - ゲージアニメーション完了で setChargeComplete(true) → 約 0.5s 後に setPhase("descending")
 * - チャージ中は AmidaCameraControls が注視点・カメラ位置を制御
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "../../hooks/useGameStore";
import { soundManager } from "../../lib/sound";
import "../../styles/countdown.css";

interface CountdownOverlayProps {
    /** 1数字あたりの表示秒数 */
    interval: number;
}

/** チャージ中に順次表示するステータスメッセージ */
const STATUS_MESSAGES = [
    "量子コア初期化中…",
    "プラズマフィールド安定化",
    "次元フォールドをマッピング",
    "エネルギー出力: 85%",
    "天体ベクトル同期中",
    "臨界閾値に到達",
];

export default function CountdownOverlay({ interval }: CountdownOverlayProps) {
    const setPhase = useGameStore((s) => s.setPhase);
    const [status, setStatus] = useState("システム準備完了");
    const [progress, setProgress] = useState(0);
    const lastTickBucket = useRef(-1);
    const { isChargeComplete, setChargeComplete, setChargeProgress } = useGameStore();

    const startDescent = useCallback(() => {
        setTimeout(() => {
            setChargeComplete(true);
            soundManager.playPon();

            setTimeout(() => {
                setPhase("descending");
            }, 600);
        }, 500);
    }, [setPhase, setChargeComplete]);

    useEffect(() => {
        let currentIdx = 0;
        const statusInterval = setInterval(() => {
            if (currentIdx < STATUS_MESSAGES.length) {
                setStatus(STATUS_MESSAGES[currentIdx]);
                currentIdx++;
            }
        }, (interval * 3000) / STATUS_MESSAGES.length);

        return () => clearInterval(statusInterval);
    }, [interval]);

    if (isChargeComplete) return null;

    const chargeDuration = interval * 3;

    return (
        <div
            className="countdown-overlay absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center px-10 py-6 bg-black/60 rounded-2xl border border-blue-400/30 shadow-[0_0_60px_rgba(0,100,255,0.3),inset_0_0_20px_rgba(0,150,255,0.1)] overflow-hidden"
            style={{ top: "75%", "--charge-duration": `${chargeDuration}s` } as React.CSSProperties}
        >
            <div className="absolute inset-0 pointer-events-none opacity-30">
                <div className="scanline" />
            </div>

            <h2 className="text-white text-lg font-black mb-1 tracking-[0.4em] font-mono italic" style={{ textShadow: "0 0 15px rgba(100,200,255,1)" }}>
                エネルギーチャージ
            </h2>

            <div className="text-[0.65rem] font-mono text-cyan-300 mb-4 h-4 tracking-[0.1em] font-bold opacity-80">
                {status}
            </div>

            <div className="w-72 h-4 bg-gray-950/80 rounded-sm overflow-hidden border border-slate-800 relative shadow-[inset_0_0_15px_rgba(0,0,0,1)]">
                <motion.div
                    className="h-full bg-gradient-to-r from-blue-900 via-cyan-500 to-white relative"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: chargeDuration, ease: [0.65, 0, 0.35, 1] }}
                    onUpdate={(latest) => {
                        if (typeof latest.width === 'string') {
                            const val = parseFloat(latest.width);
                            setProgress(val);
                            setChargeProgress(val);
                            const bucket = Math.floor(val * 20);
                            if (bucket > lastTickBucket.current && bucket <= 19) {
                                lastTickBucket.current = bucket;
                                soundManager.playChargeTick(val);
                            }
                        }
                    }}
                    onAnimationComplete={startDescent}
                >
                    <div className="absolute right-0 top-0 bottom-0 w-12 bg-white blur-md opacity-60 shine-pulse" />
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] w-20 animate-shimmer" style={{ animationDuration: '1.5s' }} />
                </motion.div>
            </div>

            <div className="mt-3 text-[0.6rem] font-bold font-mono text-blue-300/80 flex justify-between w-72 tracking-tighter">
                <div className="flex gap-4">
                    <span>コア: {Math.floor(progress * 4.2 + 273)}.2K</span>
                    <span>出力: {Math.floor(progress * 1.2)}GW</span>
                </div>
                <span className="text-cyan-400">充電: {Math.floor(progress)}%</span>
            </div>
        </div>
    );
}
