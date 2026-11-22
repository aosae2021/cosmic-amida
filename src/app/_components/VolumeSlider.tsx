"use client";

/**
 * VolumeSlider.tsx
 * 画面右下に常時表示するボリューム調節スライダー（10段階）。
 * SoundManager.setVolume() でアプリ内音声を制御する。
 */

import { useState, useCallback } from "react";
import { soundManager } from "../../lib/sound";

export default function VolumeSlider() {
    // 10段階（0〜10）、初期値 = 1
    const [level, setLevel] = useState(1);

    const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newLevel = parseInt(e.target.value, 10);
        setLevel(newLevel);
        // レベル0〜10 → 0.0〜1.0 に変換
        soundManager.setVolume(newLevel / 10);
    }, []);

    const isMuted = level === 0;

    return (
        <div
            style={{
                position: "fixed",
                bottom: "20px",
                right: "20px",
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(0, 0, 20, 0.65)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                borderRadius: "12px",
                padding: "8px 14px",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#ffffff",
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                userSelect: "none",
                boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            }}
        >
            {/* スピーカーアイコン（SVG） */}
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0, opacity: 0.9 }}
            >
                {/* スピーカー本体 */}
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" opacity="0.8" />
                {isMuted ? (
                    <>
                        {/* ミュート時: × マーク */}
                        <line x1="16" y1="9" x2="22" y2="15" stroke="#ff6b6b" strokeWidth="2.5" />
                        <line x1="22" y1="9" x2="16" y2="15" stroke="#ff6b6b" strokeWidth="2.5" />
                    </>
                ) : level <= 3 ? (
                    /* 小音量: 波1本 */
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                ) : level <= 6 ? (
                    <>
                        {/* 中音量: 波1本 */}
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" opacity="0.4" />
                    </>
                ) : (
                    <>
                        {/* 大音量: 波2本 */}
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </>
                )}
            </svg>

            {/* スライダー（10段階） */}
            <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={level}
                onChange={handleVolumeChange}
                aria-label="音量"
                style={{
                    width: "80px",
                    height: "4px",
                    appearance: "none",
                    WebkitAppearance: "none",
                    background: `linear-gradient(to right, #7eb8f7 0%, #7eb8f7 ${level * 10}%, rgba(255,255,255,0.2) ${level * 10}%, rgba(255,255,255,0.2) 100%)`,
                    borderRadius: "2px",
                    outline: "none",
                    cursor: "pointer",
                }}
            />

            {/* レベル表示 */}
            <span
                style={{
                    fontSize: "11px",
                    opacity: 0.7,
                    minWidth: "18px",
                    textAlign: "center",
                }}
            >
                {level}
            </span>
        </div>
    );
}
