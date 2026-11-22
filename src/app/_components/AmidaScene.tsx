"use client";

/**
 * AmidaScene.tsx
 *
 * 3D あみだシーンのルート。役割:
 * - useAmidaLogic(selectedPillar) で横線・カメラ経路・goalIndex を算出
 * - 算出結果を useGameStore に同期（カメラ制御・PathTrace が参照）
 * - reducedMotion 時は transitioning/countdown をスキップして result へ
 * - 柱ラベルは resetCount ごとにランダム生成し、result フェーズで goalIndex から finalResult を設定
 */

import React, { useEffect, useMemo } from "react";
import { Stars } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, Noise } from "@react-three/postprocessing";

import * as THREE from "three";
import { useGameStore } from "../../hooks/useGameStore";
import { useAmidaLogic } from "../../hooks/useAmidaLogic";
import type { AmidaConfig } from "../../lib/amidaConfig";
import { AMIDA_CONFIG } from "../../lib/amidaConfig";
import SelectionUI from "./SelectionUI";
import SolarSystem from "./SolarSystem";
import PathTrace from "./PathTrace";
import AmidaStructure from "./AmidaStructure";
import AmidaCameraControls from "./AmidaCameraControls";
import CosmicVortex from "./CosmicVortex";

const { layout } = AMIDA_CONFIG;

interface AmidaSceneProps {
    config: AmidaConfig;
    reducedMotion: boolean;
}

export default function AmidaScene({ config, reducedMotion }: AmidaSceneProps) {
    const selectedPillar = useGameStore((s) => s.selectedPillar);
    const setBridges = useGameStore((s) => s.setBridges);
    const setCameraPath = useGameStore((s) => s.setCameraPath);
    const setFinalResult = useGameStore((s) => s.setFinalResult);

    // あみだロジック（useMemo 済み）
    const { bridges, cameraPath, goalIndex } = useAmidaLogic(selectedPillar);

    // 計算結果をストアに同期
    useEffect(() => {
        if (bridges.length > 0) setBridges(bridges);
        if (cameraPath.length > 0) setCameraPath(cameraPath);
    }, [bridges, cameraPath, setBridges, setCameraPath]);

    // reducedMotion の場合は即 result フェーズへ
    useEffect(() => {
        const { phase, setPhase } = useGameStore.getState();
        if (reducedMotion && (phase === "transitioning" || phase === "countdown")) {
            setPhase("result");
        }
    }, [reducedMotion]);

    const levels = bridges.length + 2;

    const resetCount = useGameStore((s) => s.resetCount);
    const phase = useGameStore((s) => s.phase);

    // Results (Randomized)
    const pillarLabels = useMemo(() => {
        const others = ["大吉", "中吉", "小吉", "吉", "末吉"];
        return Array.from({ length: layout.pillarCount }, () =>
            others[Math.floor(Math.random() * others.length)]
        );
    }, [resetCount]); // layout.pillarCount は定数のため依存配列から除外

    // フェーズが result になった瞬間に最終結果をストアに保存
    // (ただし、スキップボタンなどですでに設定されている場合は上書きしない)
    useEffect(() => {
        const currentResult = useGameStore.getState().finalResult;
        if (phase === "result" && goalIndex !== undefined && !currentResult) {
            setFinalResult(pillarLabels[goalIndex]);
        }
    }, [phase, goalIndex, pillarLabels, setFinalResult]);

    return (
        <>
            {/* カメラ制御・オービットコントロール */}
            <AmidaCameraControls config={config} reducedMotion={reducedMotion} />

            <color attach="background" args={["#000005"]} />

            {/* 環境光（極限まで減衰） */}
            <ambientLight intensity={0.005} color="#cbdfff" />
            <pointLight position={[0, 20 + layout.pillarHeight, 10]} intensity={0.5} color="#9ce0ff" distance={50} decay={2} />
            <pointLight position={[0, -20 + layout.pillarHeight, 10]} intensity={0.3} color="#457eff" distance={50} decay={2} />

            {/* 全体的な幻想的な色付けのためのスポットライト */}
            <spotLight position={[10, 5 + layout.pillarHeight, 20]} angle={1.0} penumbra={1} intensity={1.2} color="#ff9cdd" />
            <spotLight position={[-10, 5 + layout.pillarHeight, 20]} angle={1.0} penumbra={1} intensity={1.2} color="#9cffdf" />

            {/* 宇宙の星屑（数を半減） */}
            <Stars
                radius={100}
                depth={50}
                count={7500}
                factor={4}
                saturation={1}
                fade={true}
                speed={1.0}
            />

            {/* 太陽系の惑星（背景装飾） */}
            <React.Suspense fallback={null}>
                <SolarSystem />
            </React.Suspense>

            {/* あみだの構造と横線 */}
            <AmidaStructure bridges={bridges} levels={levels} pillarLabels={pillarLabels} />

            {/* 柱選択UI（drei Html） */}
            <SelectionUI />

            {/* 結果画面でのルート可視化 */}
            <PathTrace />

            {/* 演出用コンポーネント */}

            <CosmicVortex />

            {/* Bloom エフェクト（少し強調してグロウ感アップ） */}
            <EffectComposer>
                <Bloom
                    intensity={0.2}
                    luminanceThreshold={2.8}
                    luminanceSmoothing={0.1}
                    resolutionScale={config.bloom.resolutionScale}
                    mipmapBlur
                />

                <Noise opacity={0.025} />
                <Vignette eskil={false} offset={0.1} darkness={1.1} />
            </EffectComposer>
        </>
    );
}
