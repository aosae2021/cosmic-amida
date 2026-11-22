"use client";

/**
 * AmidaGame.tsx
 * メインコンポーネント。Canvas key={resetCount} でリプレイ時に Three.js リソースを完全解放。
 * フラッシュ 0.5 秒の間に Canvas 再マウントを完了させることで黒画面を隠す。
 *
 * — WebGL非対応時にはフォールバックメッセージを表示。
 * — devicePixelRatio をモバイルでは制限してパフォーマンスを確保。
 */

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useGameStore } from "../../hooks/useGameStore";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { getDeviceConfig, isMobileDevice } from "../../lib/deviceConfig";
import { AMIDA_CONFIG } from "../../lib/amidaConfig";
import AmidaScene from "./AmidaScene";
import ResultOverlay from "./ResultOverlay";
import CountdownOverlay from "./CountdownOverlay";
import VolumeSlider from "./VolumeSlider";

/** WebGL が利用可能かどうかを判定する */
function isWebGLAvailable(): boolean {
    try {
        const canvas = document.createElement("canvas");
        return !!(
            window.WebGLRenderingContext &&
            (canvas.getContext("webgl") || canvas.getContext("webgl2"))
        );
    } catch {
        return false;
    }
}

/** WebGL 非対応時のフォールバック表示 */
function WebGLFallback() {
    return (
        <div className="loading-screen" role="alert">
            <div style={{ textAlign: "center", maxWidth: "400px", padding: "2rem" }}>
                <p style={{ fontSize: "2rem", marginBottom: "1rem" }}>🔮</p>
                <h2
                    style={{
                        fontSize: "1.3rem",
                        fontWeight: 700,
                        color: "#7eb8f7",
                        marginBottom: "0.8rem",
                    }}
                >
                    WebGL非対応
                </h2>
                <p style={{ color: "#a0b8d8", lineHeight: 1.6 }}>
                    お使いのブラウザでは3Dコンテンツを表示できません。
                    <br />
                    Chrome、Firefox、Safari の最新版をお試しください。
                </p>
            </div>
        </div>
    );
}

export default function AmidaGame() {
    const phase = useGameStore((s) => s.phase);
    const resetCount = useGameStore((s) => s.resetCount);
    const reducedMotion = useReducedMotion();

    // WebGL 対応チェック（クライアントサイドのみ）
    const [webglSupported, setWebglSupported] = useState(true);
    useEffect(() => {
        setWebglSupported(isWebGLAvailable());
    }, []);

    // デバイス別設定（クライアントサイドのみ）
    const [config, setConfig] = useState(AMIDA_CONFIG);
    const [iphoneTestMode, setIphoneTestMode] = useState(false);
    useEffect(() => {
        setConfig(getDeviceConfig(AMIDA_CONFIG));
    }, []);
    useEffect(() => {
        const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
        setIphoneTestMode(params.get("device") === "iphone");
    }, []);

    // devicePixelRatio 制御（モバイルまたはiPhoneテストモードでは dpr を制限）
    const dpr: [number, number] = isMobileDevice() || iphoneTestMode ? [1, 1.5] : [1, 2];
    const effectiveConfig = iphoneTestMode ? getDeviceConfig(AMIDA_CONFIG) : config;

    // ホワイトフラッシュのアニメーション
    const [flashOpacity, setFlashOpacity] = useState(0);
    const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (phase === "result") {
            setFlashOpacity(1);
            flashTimerRef.current = setTimeout(() => {
                setFlashOpacity(0);
            }, effectiveConfig.result.flashDuration * 1000);
        }
        return () => {
            if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        };
    }, [phase, effectiveConfig.result.flashDuration]);

    // スキップボタンのハンドラー
    const handleSkip = () => {
        // 50%の確率で「大吉」または「小吉」を強制的に決定
        const forcedResult = Math.random() < 0.5 ? "大吉" : "小吉";
        useGameStore.getState().setFinalResult(forcedResult);
        useGameStore.getState().setPhase("result");
    };

    // WebGL 非対応の場合はフォールバック表示
    if (!webglSupported) {
        return <WebGLFallback />;
    }

    const IPHONE_WIDTH = 390;
    const IPHONE_HEIGHT = 844;

    const gameContent = (
        <>
            {/* 3D Canvas: key={resetCount} でリプレイ時に完全再マウント */}
            <Canvas
                key={resetCount}
                camera={{ position: [0, 10, 20], fov: 60, far: 20000 }}
                gl={{ antialias: true }}
                dpr={dpr}
                style={{ width: "100%", height: "100%" }}
            >
                <Suspense fallback={null}>
                    <AmidaScene config={effectiveConfig} reducedMotion={reducedMotion} />
                </Suspense>
            </Canvas>

            {/* ホワイトフラッシュ */}
            {flashOpacity > 0 && (
                <div
                    className="flash-overlay"
                    style={{
                        opacity: flashOpacity,
                        transition: `opacity ${effectiveConfig.result.flashDuration}s ease-out`,
                    }}
                />
            )}

            {/* 柱選択時の説明（画面上部に固定・柱の数値とかぶらない） */}
            {phase === "selecting" && (
                <div
                    style={{
                        position: "absolute",
                        top: "52px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.5rem",
                        pointerEvents: "none",
                        zIndex: 100,
                    }}
                >
                    <p
                        style={{
                            color: "#fff",
                            fontWeight: 900,
                            fontSize: "clamp(1rem, 4vw, 1.5rem)",
                            whiteSpace: "nowrap",
                            letterSpacing: "0.15em",
                            textShadow: "0 0 20px rgba(126, 184, 247, 0.8)",
                            margin: 0,
                        }}
                    >
                        柱を選んでください
                    </p>
                    <div
                        style={{
                            width: "100%",
                            height: "2px",
                            background: "linear-gradient(90deg, transparent, #7eb8f7, transparent)",
                        }}
                    />
                    <p
                        style={{
                            color: "#a0b8d8",
                            fontWeight: 500,
                            fontSize: "0.75rem",
                            opacity: 0.8,
                            whiteSpace: "nowrap",
                            letterSpacing: "0.1em",
                            margin: 0,
                        }}
                    >
                        ドラッグで視点を回転
                    </p>
                </div>
            )}

            {/* カウントダウン */}
            {phase === "countdown" && (
                <CountdownOverlay interval={effectiveConfig.camera.countdownInterval} />
            )}

            {/* 結果画面 */}
            {phase === "result" && <ResultOverlay />}

            {/* ボリュームスライダー（常時表示） */}
            <VolumeSlider />

            {/* スキップボタン（結果画面以外で表示） */}
            {phase !== "result" && (
                <button
                    onClick={handleSkip}
                    style={{
                        position: "absolute",
                        top: "20px",
                        left: "20px",
                        padding: "10px 20px",
                        fontSize: "1rem",
                        fontWeight: "bold",
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                        color: "#ffffff",
                        border: "1px solid rgba(255, 255, 255, 0.4)",
                        borderRadius: "8px",
                        cursor: "pointer",
                        zIndex: 1000,
                        transition: "all 0.2s ease",
                        textShadow: "0 0 4px rgba(0,0,0,0.5)"
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
                        e.currentTarget.style.transform = "scale(1.05)";
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                        e.currentTarget.style.transform = "scale(1)";
                    }}
                >
                    スキップ ⏭️
                </button>
            )}
        </>
    );

    if (iphoneTestMode) {
        return (
            <div
                style={{
                    width: "100vw",
                    height: "100vh",
                    background: "#1a1a1a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <div
                    style={{
                        width: IPHONE_WIDTH,
                        height: IPHONE_HEIGHT,
                        maxWidth: "100vw",
                        maxHeight: "100vh",
                        background: "#000",
                        borderRadius: 40,
                        overflow: "hidden",
                        boxShadow: "0 0 0 12px #333, 0 25px 50px -12px rgba(0,0,0,0.5)",
                        position: "relative",
                    }}
                >
                    {gameContent}
                </div>
            </div>
        );
    }

    return gameContent;
}
