"use client";

import { useGameStore } from "../../hooks/useGameStore";
import { useEffect, useState } from "react";

/**
 * PauseOverlay.tsx
 * 一時停止時に表示されるオーバーレイ。
 */
export default function PauseOverlay() {
    const isPaused = useGameStore((s) => s.isPaused);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (isPaused) {
            setShouldRender(true);
        } else {
            // アニメーションを考慮した遅延削除も可能だが、まずはシンプルに。
            setShouldRender(false);
        }
    }, [isPaused]);

    if (!shouldRender) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
            {/* 背景のブラー (pointer-events-auto にしないことで、再度クリックして再開できるようにする) */}
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />

            {/* ポーズアイコンとテキスト */}
            <div className="relative flex flex-col items-center animate-in fade-in zoom-in duration-300">
                <div className="flex gap-3 mb-4">
                    <div className="w-4 h-16 bg-blue-400 rounded-full shadow-[0_0_20px_rgba(96,165,250,0.6)]" />
                    <div className="w-4 h-16 bg-blue-400 rounded-full shadow-[0_0_20px_rgba(96,165,250,0.6)]" />
                </div>
                <span className="text-blue-400 text-3xl font-bold tracking-[0.3em] drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]">
                    PAUSE
                </span>
            </div>
        </div>
    );
}
