"use client";

/**
 * WarikanScene3D.tsx
 *
 * 飲み会・宇宙割り勘モード用の本格 3D 宇宙あみだくじシーン。
 * - 本家おみくじモードと同じ DirectionalSparks（HDR 火花パーティクル）＆
 *   TubeGeometry 黄金軌跡 ＆ EffectComposer Bloom グロウを搭載。
 * - 降下中はカメラが火花を吹く光の玉にダイナミックに追従し、
 *   寸止めフェイント時は玉が震えながら火花を噴射してドキドキ感を最大化。
 * - 柱の上端に「参加者名」、下端に「？？？（到達ゴールのみ金額オープン）」を表示。
 */

import React, { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, Sparkles, OrbitControls, Html } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import SolarSystem from "../../_components/SolarSystem";
import CosmicVortex from "../../_components/CosmicVortex";
import DirectionalSparks from "../../_components/DirectionalSparks";
import type { WarikanLadder } from "../../../lib/warikanLogic";

export interface WarikanScene3DProps {
    ladder: WarikanLadder | null;
    activeStartIndex: number | null;
    /** 0.0 〜 1.0 の降下進捗 */
    traceProgress: number;
    /** ゴール直前の寸止めフェイント中かどうか */
    isFeintHold?: boolean;
    /** 柱ごとの参加者名（インデックス順） */
    pillarNames?: (string | null)[];
    /** ゴールごとの金額（インデックス順） */
    goalAmounts?: number[];
    /** すでに到達・公開済みのゴールインデックス一覧 */
    revealedGoalIndices?: number[];
}

const PILLAR_HEIGHT = 13;

function getPillarX(index: number, count: number): number {
    const spacing = Math.min(2.5, 11.5 / Math.max(1, count - 1));
    const totalWidth = spacing * (count - 1);
    return -totalWidth / 2 + index * spacing;
}

function getLevelY(level: number, totalLevels: number): number {
    const topY = PILLAR_HEIGHT / 2 - 1.3;
    const bottomY = -PILLAR_HEIGHT / 2 + 1.3;
    if (totalLevels <= 1) return 0;
    return topY - (level / (totalLevels - 1)) * (topY - bottomY);
}

/** 選択されたスタート柱からゴールまでの 3D 経路ポイント列（角をくっきり残す補間点付き） */
function buildTracePoints(ladder: WarikanLadder, startIndex: number): THREE.Vector3[] {
    const raw: THREE.Vector3[] = [];
    let col = startIndex;
    const topY = PILLAR_HEIGHT / 2;
    const bottomY = -PILLAR_HEIGHT / 2;

    raw.push(new THREE.Vector3(getPillarX(col, ladder.memberCount), topY, 0));

    for (let level = 0; level < ladder.levels; level++) {
        const y = getLevelY(level, ladder.levels);
        const bridge = ladder.bridges.find(
            (b) => b.level === level && (b.fromIndex === col || b.toIndex === col)
        );
        if (bridge) {
            raw.push(new THREE.Vector3(getPillarX(col, ladder.memberCount), y, 0));
            col = bridge.fromIndex === col ? bridge.toIndex : bridge.fromIndex;
            raw.push(new THREE.Vector3(getPillarX(col, ladder.memberCount), y, 0));
        }
    }

    raw.push(new THREE.Vector3(getPillarX(col, ladder.memberCount), bottomY, 0));

    // 角が丸くなりすぎないよう各セグメントに中間点を挿入
    const dense: THREE.Vector3[] = [raw[0]];
    for (let i = 0; i < raw.length - 1; i++) {
        const a = raw[i];
        const b = raw[i + 1];
        const dist = a.distanceTo(b);
        if (dist > 0.2) {
            dense.push(a.clone().lerp(b, 0.15));
            dense.push(a.clone().lerp(b, 0.5));
            dense.push(a.clone().lerp(b, 0.85));
        }
        dense.push(b);
    }
    return dense;
}

/**
 * 火花を吹き散らしながら光る軌跡を描くボール＆ダイナミックカメラ制御
 */
function FieryBallAndCamera({
    points,
    progress,
    isFeintHold,
    isDescending,
}: {
    points: THREE.Vector3[] | null;
    progress: number;
    isFeintHold: boolean;
    isDescending: boolean;
}) {
    const { camera, size } = useThree();
    const isPortrait = size.width < size.height;
    const overviewZ = isPortrait ? 23 : 16.5;

    const ballGroupRef = useRef<THREE.Group>(null);
    const tubeGeomRef = useRef<THREE.TubeGeometry>(null);
    const tipPosRef = useRef<THREE.Vector3 | null>(null);
    const tangentRef = useRef(new THREE.Vector3(0, -1, 0));
    const lookAtRef = useRef(new THREE.Vector3(0, 0.5, 0));

    const curve = useMemo(() => {
        if (!points || points.length < 2) return null;
        return new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.08);
    }, [points]);

    useFrame((state) => {
        // 1. 軌跡チューブ & 火花玉の更新
        if (curve && ballGroupRef.current && progress > 0) {
            const t = Math.max(0, Math.min(1, progress));
            const pos = curve.getPointAt(t);
            const tangent = curve.getTangentAt(t).normalize();

            // 寸止めフェイント中は小刻みにブルブル振動させて緊迫感アップ！
            const jitterX = isFeintHold ? Math.sin(state.clock.elapsedTime * 55) * 0.12 : 0;
            const jitterY = isFeintHold ? Math.cos(state.clock.elapsedTime * 63) * 0.08 : 0;

            ballGroupRef.current.position.set(pos.x + jitterX, pos.y + jitterY, pos.z);
            ballGroupRef.current.scale.setScalar(isFeintHold ? 1.25 : 1.0);
            tipPosRef.current = ballGroupRef.current.position;
            tangentRef.current.copy(isFeintHold ? new THREE.Vector3(0, -1, 0) : tangent);

            if (tubeGeomRef.current && tubeGeomRef.current.index) {
                const totalIndices = tubeGeomRef.current.index.count;
                tubeGeomRef.current.setDrawRange(0, Math.floor(t * totalIndices));
            }

            // 2. カメラ追従（降下中は玉にグッと寄って迫力満点に追いかける！）
            if (isDescending) {
                const zoomZ = isFeintHold
                    ? isPortrait
                        ? 8.5
                        : 6.8
                    : isPortrait
                    ? 11.5
                    : 8.8;
                const targetCamPos = new THREE.Vector3(
                    pos.x * 0.85,
                    pos.y + 1.2,
                    zoomZ
                );
                camera.position.lerp(targetCamPos, 0.09);
                lookAtRef.current.lerp(new THREE.Vector3(pos.x, pos.y - 0.6, 0), 0.12);
                camera.lookAt(lookAtRef.current);
                return;
            }
        } else {
            tipPosRef.current = null;
            if (tubeGeomRef.current) {
                tubeGeomRef.current.setDrawRange(0, 0);
            }
        }

        // 俯瞰カメラへスムーズに戻す
        const overviewPos = new THREE.Vector3(0, 0.8, overviewZ);
        camera.position.lerp(overviewPos, 0.06);
        lookAtRef.current.lerp(new THREE.Vector3(0, 0.2, 0), 0.08);
        camera.lookAt(lookAtRef.current);
    });

    if (!curve || progress <= 0) return null;

    return (
        <group>
            {/* 黄金に光る軌跡チューブ */}
            <mesh>
                <tubeGeometry ref={tubeGeomRef} args={[curve, 220, 0.14, 8, false]} />
                <meshStandardMaterial
                    color="#ffdd44"
                    emissive="#ff9900"
                    emissiveIntensity={3.5}
                    transparent
                    opacity={0.95}
                />
            </mesh>

            {/* 先端の灼熱ライトコア */}
            <group ref={ballGroupRef} position={curve.getPointAt(0)}>
                <mesh>
                    <sphereGeometry args={[0.34, 24, 24]} />
                    <meshStandardMaterial
                        color="#ffffff"
                        emissive="#ffee88"
                        emissiveIntensity={10}
                    />
                </mesh>
                {/* 外側の炎オーラ */}
                <mesh>
                    <sphereGeometry args={[0.52, 16, 16]} />
                    <meshBasicMaterial
                        color="#ff7700"
                        transparent
                        opacity={0.4}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                    />
                </mesh>
                <pointLight color="#ffaa22" intensity={18} distance={10} decay={2} />
            </group>

            {/* 本家と同じ HDR 火花パーティクル噴射！ */}
            {isDescending && (
                <DirectionalSparks tipPosRef={tipPosRef} tangentRef={tangentRef} />
            )}
        </group>
    );
}

function LadderMeshes({
    ladder,
    activeStartIndex,
    traceProgress,
    isFeintHold = false,
    pillarNames = [],
    goalAmounts = [],
    revealedGoalIndices = [],
}: WarikanScene3DProps) {
    const tracePoints = useMemo(() => {
        if (!ladder || activeStartIndex === null) return null;
        return buildTracePoints(ladder, activeStartIndex);
    }, [ladder, activeStartIndex]);

    const isDescending = traceProgress > 0 && traceProgress < 1;

    if (!ladder) return null;

    return (
        <group position={[0, 0.3, 0]}>
            {/* クリスタル縦柱 */}
            {Array.from({ length: ladder.memberCount }, (_, i) => {
                const x = getPillarX(i, ladder.memberCount);
                const isActive = activeStartIndex === i;
                const topName = pillarNames[i];
                const isGoalRevealed = revealedGoalIndices.includes(i);
                const goalAmt = goalAmounts[i];

                return (
                    <group key={`pillar-${i}`} position={[x, 0, 0]}>
                        <mesh>
                            <cylinderGeometry args={[0.08, 0.1, PILLAR_HEIGHT, 16]} />
                            <meshStandardMaterial
                                color={isActive ? "#ffe066" : "#b8e0ff"}
                                emissive={isActive ? "#ff8800" : "#1a68d8"}
                                emissiveIntensity={isActive ? 2.2 : 1.1}
                                roughness={0.15}
                                metalness={0.8}
                            />
                        </mesh>
                        <Sparkles
                            count={14}
                            scale={[0.7, PILLAR_HEIGHT, 0.7]}
                            size={2.8}
                            speed={0.45}
                            opacity={0.6}
                            color={isActive ? "#ffe066" : "#a8d8ff"}
                        />

                        {/* 上端：参加者名ラベル */}
                        {topName && (
                            <Html position={[0, PILLAR_HEIGHT / 2 + 0.85, 0]} center zIndexRange={[20, 10]}>
                                <div
                                    style={{
                                        background: isActive
                                            ? "rgba(255, 165, 0, 0.85)"
                                            : "rgba(10, 20, 50, 0.78)",
                                        border: isActive
                                            ? "1px solid #fff3b0"
                                            : "1px solid rgba(126, 184, 247, 0.5)",
                                        color: isActive ? "#0f172a" : "#e0f2fe",
                                        padding: "2px 8px",
                                        borderRadius: "999px",
                                        fontSize: "11px",
                                        fontWeight: 900,
                                        whiteSpace: "nowrap",
                                        boxShadow: isActive
                                            ? "0 0 14px rgba(255, 190, 60, 0.85)"
                                            : "none",
                                    }}
                                >
                                    {topName}
                                </div>
                            </Html>
                        )}

                        {/* 下端：ゴール金額（未公開は ？？？、到達ゴールはパカッと表示！） */}
                        {goalAmounts.length === ladder.memberCount && (
                            <Html position={[0, -PILLAR_HEIGHT / 2 - 0.95, 0]} center zIndexRange={[20, 10]}>
                                <div
                                    style={{
                                        background: isGoalRevealed
                                            ? goalAmt === 0
                                                ? "rgba(16, 185, 129, 0.9)"
                                                : "rgba(217, 119, 6, 0.9)"
                                            : "rgba(15, 23, 42, 0.82)",
                                        border: isGoalRevealed
                                            ? "1px solid #fef08a"
                                            : "1px solid rgba(148, 163, 184, 0.4)",
                                        color: "#ffffff",
                                        padding: "3px 9px",
                                        borderRadius: "8px",
                                        fontSize: "11px",
                                        fontWeight: 900,
                                        whiteSpace: "nowrap",
                                        boxShadow: isGoalRevealed
                                            ? "0 0 16px rgba(251, 191, 36, 0.7)"
                                            : "none",
                                    }}
                                >
                                    {isGoalRevealed && goalAmt !== undefined
                                        ? goalAmt === 0
                                            ? "🎉 ¥0"
                                            : `¥${goalAmt.toLocaleString()}`
                                        : "？？？"}
                                </div>
                            </Html>
                        )}
                    </group>
                );
            })}

            {/* 横線（マジックブリッジ） */}
            {ladder.bridges.map((b, idx) => {
                const x1 = getPillarX(b.fromIndex, ladder.memberCount);
                const x2 = getPillarX(b.toIndex, ladder.memberCount);
                const y = getLevelY(b.level, ladder.levels);
                const width = Math.abs(x2 - x1);
                return (
                    <mesh
                        key={`bridge-${idx}`}
                        position={[(x1 + x2) / 2, y, 0]}
                        rotation={[0, 0, Math.PI / 2]}
                    >
                        <cylinderGeometry args={[0.055, 0.055, width, 12]} />
                        <meshStandardMaterial
                            color="#e9d5ff"
                            emissive="#9333ea"
                            emissiveIntensity={1.6}
                            transparent
                            opacity={0.9}
                        />
                    </mesh>
                );
            })}

            {/* 火花を吹きながら降下する光の玉＋黄金軌跡＋追従カメラ */}
            <FieryBallAndCamera
                points={tracePoints}
                progress={traceProgress}
                isFeintHold={isFeintHold}
                isDescending={isDescending}
            />
        </group>
    );
}

export default function WarikanScene3D(props: WarikanScene3DProps) {
    const isDescending = props.traceProgress > 0 && props.traceProgress < 1;

    return (
        <div className="fixed inset-0 z-0 pointer-events-none">
            <Canvas
                camera={{ position: [0, 0.8, 17], fov: 55, far: 20000 }}
                dpr={[1, 1.5]}
                gl={{ antialias: true }}
            >
                <color attach="background" args={["#020412"]} />
                <ambientLight intensity={0.2} color="#cbdfff" />
                <pointLight position={[10, 12, 15]} intensity={1.8} color="#9ce0ff" />
                <pointLight position={[-10, -8, 12]} intensity={1.2} color="#ff9cdd" />

                <Stars
                    radius={100}
                    depth={50}
                    count={5500}
                    factor={4}
                    saturation={1}
                    fade
                    speed={0.9}
                />

                <React.Suspense fallback={null}>
                    <SolarSystem />
                </React.Suspense>

                <CosmicVortex />

                <LadderMeshes {...props} />

                {/* 降下中以外はゆっくり俯瞰回転（降下中は追従カメラに譲る） */}
                {!isDescending && (
                    <OrbitControls
                        enableZoom={false}
                        enablePan={false}
                        enabled={false}
                    />
                )}

                {/* 本家と同じ Bloom グロウ（火花・軌跡・光の玉が宇宙空間で眩しく光る） */}
                <EffectComposer>
                    <Bloom
                        intensity={0.45}
                        luminanceThreshold={1.2}
                        luminanceSmoothing={0.15}
                        mipmapBlur
                    />
                    <Vignette eskil={false} offset={0.15} darkness={0.9} />
                </EffectComposer>
            </Canvas>
        </div>
    );
}
