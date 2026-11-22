"use client";

/**
 * PathTrace.tsx
 * 移動した経路 (cameraPath) を光るラインとして描画する。
 * 背景に薄くガイドライン（柱・ブリッジ）を表示し、
 * 先端には光のコアと火花エフェクトを表示する。
 * パフォーマンス最適化のため、再レンダリングを極力防ぎ、useFrame内で直接オブジェクトを操作します。
 */

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "../../hooks/useGameStore";
import { pillarPositionOf } from "../../hooks/useAmidaLogic";
import { AMIDA_CONFIG } from "../../lib/amidaConfig";
import DirectionalSparks from "./DirectionalSparks";

const { layout } = AMIDA_CONFIG;

export default function PathTrace() {
    // 再レンダリングのトリガーになり得る、静的またはフェーズごとにしか変化しないステートのみ購読
    const phase = useGameStore((s) => s.phase);
    const cameraPath = useGameStore((s) => s.cameraPath);
    const bridges = useGameStore((s) => s.bridges);

    // useFrame内で操作するRef（火花の向き用に接線も渡す）
    const tipPosRef = useRef<THREE.Vector3 | null>(null);
    const tangentRef = useRef(new THREE.Vector3(0, 1, 0));
    const ballGroupRef = useRef<THREE.Group>(null);
    const lightRef = useRef<THREE.PointLight>(null);
    const tubeGeomRef = useRef<THREE.TubeGeometry>(null);

    // 完全なCatmullRomCurve3を生成 (1回のみ生成されるため軽量)
    const fullCurve = useMemo(() => {
        if (cameraPath.length < 2) return null;
        const corePoints = cameraPath.slice(1, -1);
        if (corePoints.length < 2) return null;
        return new THREE.CatmullRomCurve3(
            corePoints,
            false,
            "catmullrom",
            AMIDA_CONFIG.camera.splineTension
        );
    }, [cameraPath]);

    // 柱のガイドライン
    const pillarGuides = useMemo(() => {
        const lines = [];
        for (let i = 0; i < layout.pillarCount; i++) {
            const pos = pillarPositionOf(i);
            const pts = [
                new THREE.Vector3(pos.x, layout.pillarHeight / 2, pos.z),
                new THREE.Vector3(pos.x, -layout.pillarHeight / 2, pos.z),
            ];
            lines.push(pts);
        }
        return lines;
    }, []);

    // ブリッジのガイドライン
    const bridgeGuides = useMemo(() => {
        const lines = [];
        const levels = bridges.length + 2;
        const levelHeight = layout.pillarHeight / (levels + 1);

        for (const b of bridges) {
            const from = pillarPositionOf(b.fromIndex);
            const to = pillarPositionOf(b.toIndex);
            const y = layout.pillarHeight / 2 - (b.heightIndex + 1) * levelHeight;
            lines.push([
                new THREE.Vector3(from.x, y, from.z),
                new THREE.Vector3(to.x, y, to.z),
            ]);
        }
        return lines;
    }, [bridges]);

    // 毎フレームごとの更新（Reactの再レンダリングを介さず直接Three.jsオブジェクトを操作）
    useFrame(() => {
        if (!fullCurve || !ballGroupRef.current) return;

        const state = useGameStore.getState();
        const { phase: currentPhase, descentProgress, chargeProgress } = state;

        // --- チューブの描画範囲（DrawRange）の更新による伸びるアニメーション ---
        if (tubeGeomRef.current && tubeGeomRef.current.index) {
            const totalIndices = tubeGeomRef.current.index.count;
            if (currentPhase === "descending") {
                // 進捗に合わせて描画するインデックス数を計算（玉より先に塗らない＝玉が先端）
                const drawCount = Math.floor(descentProgress * totalIndices);
                tubeGeomRef.current.setDrawRange(0, drawCount);
            } else if (currentPhase === "result") {
                tubeGeomRef.current.setDrawRange(0, totalIndices);
            } else {
                tubeGeomRef.current.setDrawRange(0, 0); // カウントダウン中などは描画しない
            }
        }

        // --- 玉のスケール・位置制御 ---
        if (currentPhase === "countdown") {
            const scale = Math.max(0.001, chargeProgress / 100);
            ballGroupRef.current.scale.setScalar(scale);
            if (lightRef.current) lightRef.current.intensity = 20 * scale;

            const startPoint = fullCurve.getPointAt(0);
            ballGroupRef.current.position.copy(startPoint);
            tipPosRef.current = startPoint;
        } else if (currentPhase === "descending" || currentPhase === "result") {
            const scale = 1.0;
            ballGroupRef.current.scale.setScalar(scale);
            if (lightRef.current) lightRef.current.intensity = 20;

            const t = currentPhase === "result" ? 1.0 : Math.min(descentProgress, 1.0);
            const pos = fullCurve.getPointAt(t);
            ballGroupRef.current.position.copy(pos);
            tipPosRef.current = pos;
            tangentRef.current.copy(fullCurve.getTangentAt(t)).normalize();
        } else {
            // selecting 等のフェーズでは玉を隠す
            ballGroupRef.current.scale.setScalar(0);
            if (lightRef.current) lightRef.current.intensity = 0;
            tipPosRef.current = null;
        }
    });

    if (phase === "selecting" || phase === "transitioning") return null;

    return (
        <group>
            {/* 柱のガイド */}
            {pillarGuides.map((pts, i) => (
                <line key={`p-${i}`}>
                    <bufferGeometry attach="geometry" setFromPoints={pts} />
                    <lineBasicMaterial attach="material" color="#ffffff" transparent opacity={0.1} />
                </line>
            ))}

            {/* ブリッジのガイド */}
            {bridgeGuides.map((pts, i) => (
                <line key={`b-${i}`}>
                    <bufferGeometry attach="geometry" setFromPoints={pts} />
                    <lineBasicMaterial attach="material" color="#ffffff" transparent opacity={0.1} />
                </line>
            ))}

            {/* 描画範囲を動的に広げることで伸びるチューブトレース */}
            {fullCurve && (
                <mesh>
                    <tubeGeometry ref={tubeGeomRef} args={[fullCurve, 200, 0.15, 8, false]} />
                    <meshStandardMaterial
                        color="#ffcc00"
                        emissive="#ffaa00"
                        emissiveIntensity={3}
                        transparent
                        opacity={0.9}
                    />
                </mesh>
            )}

            {/* 先端の光のコア */}
            <group ref={ballGroupRef}>
                <mesh>
                    <sphereGeometry args={[0.3, 16, 16]} />
                    <meshStandardMaterial color="#ffffff" emissive="#ffee88" emissiveIntensity={10} />
                    <pointLight ref={lightRef} color="#ffcc00" intensity={0} distance={5} />
                </mesh>
            </group>

            {/* 火花は降下中のみ描画 */}
            {phase === "descending" && <DirectionalSparks tipPosRef={tipPosRef} tangentRef={tangentRef} />}
        </group>
    );
}
