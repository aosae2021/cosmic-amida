"use client";

/**
 * WarikanScene3D.tsx
 *
 * 飲み会・宇宙割り勘モード用のシネマティック 3D 宇宙あみだくじシーン。
 * - スタート時（柱選択フェーズ）は、上端の「参加者名」から下端の「金額（選択肢）」まで
 *   1画面に全体が綺麗に収まる俯瞰カメラで表示。
 * - 降下スタート後は 4 幕のドラマティックカメラワーク（ロックオンズーム → 火花降下＆バンキング
 *   → 寸止め超ズーム＆シェイク → 着弾インパクト＆俯瞰戻り）を実行。
 */

import React, { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, Sparkles, Html } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import SolarSystem from "../../_components/SolarSystem";
import CosmicVortex from "../../_components/CosmicVortex";
import DirectionalSparks from "../../_components/DirectionalSparks";
import type { WarikanLadder } from "../../../lib/warikanLogic";

export type RevealSubPhase = "idle" | "lockon" | "descending" | "feint" | "landed";

export interface WarikanScene3DProps {
    ladder: WarikanLadder | null;
    activeStartIndex: number | null;
    /** 0.0 〜 1.0 の降下進捗 */
    traceProgress: number;
    /** 現在のドラマティック演出フェーズ */
    revealPhase?: RevealSubPhase;
    /** 柱ごとの参加者名（インデックス順） */
    pillarNames?: (string | null)[];
    /** ゴールごとの金額（インデックス順） */
    goalAmounts?: number[];
    /** 下端のゴール金額を最初から表示するかどうか */
    showGoalAmounts?: boolean;
    /** すでに到達・確定済みのゴールインデックス一覧 */
    revealedGoalIndices?: number[];
}

const PILLAR_HEIGHT = 11.2;

function getPillarX(index: number, count: number): number {
    const spacing = Math.min(2.4, 11.2 / Math.max(1, count - 1));
    const totalWidth = spacing * (count - 1);
    return -totalWidth / 2 + index * spacing;
}

function getLevelY(level: number, totalLevels: number): number {
    const topY = PILLAR_HEIGHT / 2 - 1.1;
    const bottomY = -PILLAR_HEIGHT / 2 + 1.1;
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

    const dense: THREE.Vector3[] = [raw[0]];
    for (let i = 0; i < raw.length - 1; i++) {
        const a = raw[i];
        const b = raw[i + 1];
        const dist = a.distanceTo(b);
        if (dist > 0.2) {
            dense.push(a.clone().lerp(b, 0.14));
            dense.push(a.clone().lerp(b, 0.5));
            dense.push(a.clone().lerp(b, 0.86));
        }
        dense.push(b);
    }
    return dense;
}

/**
 * 火花を吹き散らしながら光る軌跡を描くボール＆4幕シネマティックカメラ制御
 */
function FieryBallAndCamera({
    points,
    progress,
    revealPhase,
}: {
    points: THREE.Vector3[] | null;
    progress: number;
    revealPhase: RevealSubPhase;
}) {
    const { camera, size } = useThree();
    const isPortrait = size.width < size.height;
    // 上端の名前〜下端の金額まで余裕で1画面に収まる俯瞰距離
    const overviewZ = isPortrait ? 28.5 : 20.0;
    const baseFov = isPortrait ? 60 : 52;

    const ballGroupRef = useRef<THREE.Group>(null);
    const tubeGeomRef = useRef<THREE.TubeGeometry>(null);
    const tipPosRef = useRef<THREE.Vector3 | null>(null);
    const tangentRef = useRef(new THREE.Vector3(0, -1, 0));
    const lookAtRef = useRef(new THREE.Vector3(0, 0.1, 0));
    const bankRef = useRef(0);

    const curve = useMemo(() => {
        if (!points || points.length < 2) return null;
        return new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.08);
    }, [points]);

    useFrame((state) => {
        const elapsed = state.clock.elapsedTime;
        const isActiveCamera =
            revealPhase === "lockon" ||
            revealPhase === "descending" ||
            revealPhase === "feint";

        if (curve && ballGroupRef.current && revealPhase !== "idle") {
            const t =
                revealPhase === "lockon"
                    ? 0
                    : Math.max(0, Math.min(1, progress));
            const pos = curve.getPointAt(t);
            const tangent = curve.getTangentAt(t).normalize();

            // 寸止めフェイント中はブルブル震えて臨場感アップ
            const isFeint = revealPhase === "feint";
            const jitterX = isFeint ? Math.sin(elapsed * 58) * 0.12 : 0;
            const jitterY = isFeint ? Math.cos(elapsed * 66) * 0.08 : 0;

            // ロックオン中は玉が脈動しながらチャージ
            const ballScale =
                revealPhase === "lockon"
                    ? 0.9 + Math.sin(elapsed * 18) * 0.25
                    : isFeint
                    ? 1.3 + Math.sin(elapsed * 30) * 0.12
                    : 1.05;

            ballGroupRef.current.position.set(pos.x + jitterX, pos.y + jitterY, pos.z);
            ballGroupRef.current.scale.setScalar(ballScale);
            tipPosRef.current = ballGroupRef.current.position;
            tangentRef.current.copy(isFeint ? new THREE.Vector3(0, -1, 0) : tangent);

            if (tubeGeomRef.current && tubeGeomRef.current.index) {
                const totalIndices = tubeGeomRef.current.index.count;
                const drawCount =
                    revealPhase === "lockon" ? 0 : Math.floor(t * totalIndices);
                tubeGeomRef.current.setDrawRange(0, drawCount);
            }

            if (isActiveCamera) {
                let targetCamPos: THREE.Vector3;
                let targetLookAt: THREE.Vector3;
                let targetFov = baseFov;
                let targetBank = 0;

                if (revealPhase === "lockon") {
                    // 第1幕：スタート柱の上端（参加者名）へドラマティックにズームイン
                    const zoomZ = isPortrait ? 12.0 : 9.2;
                    targetCamPos = new THREE.Vector3(pos.x * 0.95, pos.y + 0.8, zoomZ);
                    targetLookAt = new THREE.Vector3(pos.x, pos.y - 0.8, 0);
                    targetFov = baseFov - 5;
                } else if (revealPhase === "feint") {
                    // 第3幕：ゴール直前で超ズーム＋微細カメラシェイク
                    const zoomZ = isPortrait ? 9.2 : 7.0;
                    const shakeX = Math.sin(elapsed * 42) * 0.08;
                    const shakeY = Math.cos(elapsed * 49) * 0.06;
                    targetCamPos = new THREE.Vector3(
                        pos.x * 0.9 + shakeX,
                        pos.y + 0.4 + shakeY,
                        zoomZ
                    );
                    targetLookAt = new THREE.Vector3(pos.x, pos.y - 0.9, 0);
                    targetFov = baseFov - 8;
                } else {
                    // 第2幕：火花を吹きながら降下を追従（横移動でバンキング＆FOV拡大！）
                    const isHorizontal = Math.abs(tangent.x) > 0.45;
                    const zoomZ = isPortrait ? 12.5 : 9.6;
                    targetCamPos = new THREE.Vector3(
                        pos.x * 0.85 - tangent.x * 1.4,
                        pos.y + 1.1,
                        zoomZ
                    );
                    targetLookAt = new THREE.Vector3(
                        pos.x + tangent.x * 0.6,
                        pos.y - 0.8,
                        0
                    );
                    targetFov = isHorizontal ? baseFov + 7 : baseFov + 2;
                    targetBank = isHorizontal ? -Math.sign(tangent.x) * 0.11 : 0;
                }

                camera.position.lerp(targetCamPos, 0.1);
                lookAtRef.current.lerp(targetLookAt, 0.13);
                camera.lookAt(lookAtRef.current);

                bankRef.current = THREE.MathUtils.lerp(bankRef.current, targetBank, 0.12);
                camera.rotation.z += bankRef.current;

                if (camera instanceof THREE.PerspectiveCamera) {
                    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.1);
                    camera.updateProjectionMatrix();
                }
                return;
            }
        } else {
            tipPosRef.current = null;
            if (tubeGeomRef.current) {
                tubeGeomRef.current.setDrawRange(0, 0);
            }
        }

        // 全体俯瞰カメラ（スタート時・ゴール着弾後：上端の名前〜下端の金額まで丸見え）
        const gentleSwayX = Math.sin(elapsed * 0.35) * 0.45;
        const overviewPos = new THREE.Vector3(gentleSwayX, 0.15, overviewZ);
        camera.position.lerp(overviewPos, 0.08);
        lookAtRef.current.lerp(new THREE.Vector3(0, 0.0, 0), 0.1);
        camera.lookAt(lookAtRef.current);
        bankRef.current = THREE.MathUtils.lerp(bankRef.current, 0, 0.1);

        if (camera instanceof THREE.PerspectiveCamera) {
            camera.fov = THREE.MathUtils.lerp(camera.fov, baseFov, 0.08);
            camera.updateProjectionMatrix();
        }
    });

    if (!curve || revealPhase === "idle") return null;

    const showSparks =
        revealPhase === "lockon" ||
        revealPhase === "descending" ||
        revealPhase === "feint";

    return (
        <group>
            {/* 黄金に光る軌跡チューブ */}
            <mesh>
                <tubeGeometry ref={tubeGeomRef} args={[curve, 220, 0.14, 8, false]} />
                <meshStandardMaterial
                    color="#ffdd44"
                    emissive="#ff9900"
                    emissiveIntensity={3.6}
                    transparent
                    opacity={0.95}
                />
            </mesh>

            {/* 先端の灼熱ライトコア */}
            <group ref={ballGroupRef} position={curve.getPointAt(0)}>
                <mesh>
                    <sphereGeometry args={[0.35, 24, 24]} />
                    <meshStandardMaterial
                        color="#ffffff"
                        emissive="#ffee88"
                        emissiveIntensity={11}
                    />
                </mesh>
                <mesh>
                    <sphereGeometry args={[0.56, 16, 16]} />
                    <meshBasicMaterial
                        color="#ff7700"
                        transparent
                        opacity={0.45}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                    />
                </mesh>
                <pointLight color="#ffaa22" intensity={20} distance={11} decay={2} />
            </group>

            {/* 本家と同じ HDR 火花パーティクル噴射！ */}
            {showSparks && (
                <DirectionalSparks tipPosRef={tipPosRef} tangentRef={tangentRef} />
            )}
        </group>
    );
}

function LadderMeshes({
    ladder,
    activeStartIndex,
    traceProgress,
    revealPhase = "idle",
    pillarNames = [],
    goalAmounts = [],
    showGoalAmounts = true,
    revealedGoalIndices = [],
}: WarikanScene3DProps) {
    const tracePoints = useMemo(() => {
        if (!ladder || activeStartIndex === null) return null;
        return buildTracePoints(ladder, activeStartIndex);
    }, [ladder, activeStartIndex]);

    if (!ladder) return null;

    return (
        <group position={[0, 0.2, 0]}>
            {/* クリスタル縦柱 */}
            {Array.from({ length: ladder.memberCount }, (_, i) => {
                const x = getPillarX(i, ladder.memberCount);
                const isActive = activeStartIndex === i;
                const topName = pillarNames[i];
                const isGoalRevealed = revealedGoalIndices.includes(i);
                const goalAmt = goalAmounts[i];
                const shouldShowAmount = (showGoalAmounts || isGoalRevealed) && goalAmt !== undefined;

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

                        {/* 上端：誰がどこを選んでいるか（未選択は柱番号、選択済みは名前が光る） */}
                        <Html
                            position={[0, PILLAR_HEIGHT / 2 + 0.85, 0]}
                            center
                            zIndexRange={[20, 10]}
                            style={{ pointerEvents: "none" }}
                        >
                            <div
                                style={{
                                    pointerEvents: "none",
                                    background: isActive
                                        ? "linear-gradient(135deg, #fde047, #f97316)"
                                        : topName
                                        ? "rgba(37, 99, 235, 0.9)"
                                        : "rgba(15, 23, 42, 0.78)",
                                    border: isActive
                                        ? "2px solid #ffffff"
                                        : topName
                                        ? "1px solid #93c5fd"
                                        : "1px solid rgba(148, 163, 184, 0.45)",
                                    color: isActive ? "#0f172a" : "#ffffff",
                                    padding: "3px 9px",
                                    borderRadius: "999px",
                                    fontSize: ladder.memberCount >= 7 ? "10px" : "11px",
                                    fontWeight: 900,
                                    whiteSpace: "nowrap",
                                    boxShadow: isActive
                                        ? "0 0 18px rgba(251, 191, 36, 0.95)"
                                        : topName
                                        ? "0 0 12px rgba(59, 130, 246, 0.65)"
                                        : "none",
                                }}
                            >
                                {topName ? `${i + 1}:${topName}` : `柱 ${i + 1}`}
                            </div>
                        </Html>

                        {/* 下端：一番下の選択肢（金額がスタート時から確認可能／到達時は黄金ハイライト） */}
                        {goalAmounts.length === ladder.memberCount && (
                            <Html
                                position={[0, -PILLAR_HEIGHT / 2 - 0.9, 0]}
                                center
                                zIndexRange={[20, 10]}
                                style={{ pointerEvents: "none" }}
                            >
                                <div
                                    style={{
                                        pointerEvents: "none",
                                        background: isGoalRevealed
                                            ? goalAmt === 0
                                                ? "linear-gradient(135deg, #10b981, #059669)"
                                                : "linear-gradient(135deg, #f59e0b, #ea580c)"
                                            : shouldShowAmount && goalAmt === 0
                                            ? "rgba(6, 78, 59, 0.88)"
                                            : "rgba(15, 23, 42, 0.86)",
                                        border: isGoalRevealed
                                            ? "2px solid #fef08a"
                                            : shouldShowAmount && goalAmt === 0
                                            ? "1px solid #34d399"
                                            : "1px solid rgba(251, 191, 36, 0.45)",
                                        color: "#ffffff",
                                        padding: "3px 9px",
                                        borderRadius: "8px",
                                        fontSize: ladder.memberCount >= 7 ? "10px" : "11px",
                                        fontWeight: 900,
                                        whiteSpace: "nowrap",
                                        transform: isGoalRevealed ? "scale(1.18)" : "scale(1)",
                                        transition: "transform 400ms cubic-bezier(0.34, 1.45, 0.64, 1)",
                                        boxShadow: isGoalRevealed
                                            ? "0 0 20px rgba(251, 191, 36, 0.85)"
                                            : "none",
                                    }}
                                >
                                    {shouldShowAmount
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
                            opacity={0.92}
                        />
                    </mesh>
                );
            })}

            {/* 火花を吹きながら降下する光の玉＋黄金軌跡＋4幕シネマティックカメラ */}
            <FieryBallAndCamera
                points={tracePoints}
                progress={traceProgress}
                revealPhase={revealPhase}
            />
        </group>
    );
}

export default function WarikanScene3D(props: WarikanScene3DProps) {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none">
            <Canvas
                camera={{ position: [0, 0.15, 20], fov: 52, far: 20000 }}
                dpr={[1, 1.5]}
                gl={{ antialias: true }}
            >
                <color attach="background" args={["#020412"]} />
                <ambientLight intensity={0.22} color="#cbdfff" />
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

                {/* Bloom グロウ（火花・軌跡・光の玉が宇宙空間で眩しく光る） */}
                <EffectComposer>
                    <Bloom
                        intensity={0.45}
                        luminanceThreshold={1.2}
                        luminanceSmoothing={0.15}
                        mipmapBlur
                    />
                    <Vignette eskil={false} offset={0.15} darkness={0.85} />
                </EffectComposer>
            </Canvas>
        </div>
    );
}
