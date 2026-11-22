"use client";

/**
 * WarikanScene3D.tsx
 *
 * 飲み会・宇宙割り勘モード用の軽量3D宇宙背景＋ダイナミック柱（2〜8本）表示。
 * - 背景に星屑・太陽系（SolarSystem）・宇宙渦（CosmicVortex）を描画。
 * - 人数に応じたクリスタル柱と横線、降下アニメーション（アクティブな1本の経路ハイライト）を描画。
 */

import React, { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Sparkles, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import SolarSystem from "../../_components/SolarSystem";
import CosmicVortex from "../../_components/CosmicVortex";
import type { WarikanLadder } from "../../../lib/warikanLogic";

interface WarikanScene3DProps {
    ladder: WarikanLadder | null;
    activeStartIndex: number | null;
    /** 0.0 〜 1.0 の降下進捗（アニメーション中のみ使用） */
    traceProgress: number;
}

const PILLAR_HEIGHT = 12;

function getPillarX(index: number, count: number): number {
    const spacing = Math.min(2.6, 12 / Math.max(1, count - 1));
    const totalWidth = spacing * (count - 1);
    return -totalWidth / 2 + index * spacing;
}

function getLevelY(level: number, totalLevels: number): number {
    const topY = PILLAR_HEIGHT / 2 - 1.2;
    const bottomY = -PILLAR_HEIGHT / 2 + 1.2;
    if (totalLevels <= 1) return 0;
    return topY - (level / (totalLevels - 1)) * (topY - bottomY);
}

/** 選択されたスタート柱からゴールまでの 3D 経路ポイント列を作成 */
function buildTracePoints(ladder: WarikanLadder, startIndex: number): THREE.Vector3[] {
    const pts: THREE.Vector3[] = [];
    let col = startIndex;
    const topY = PILLAR_HEIGHT / 2;
    const bottomY = -PILLAR_HEIGHT / 2;

    pts.push(new THREE.Vector3(getPillarX(col, ladder.memberCount), topY, 0));

    for (let level = 0; level < ladder.levels; level++) {
        const y = getLevelY(level, ladder.levels);
        const bridge = ladder.bridges.find(
            (b) => b.level === level && (b.fromIndex === col || b.toIndex === col)
        );
        if (bridge) {
            pts.push(new THREE.Vector3(getPillarX(col, ladder.memberCount), y, 0));
            col = bridge.fromIndex === col ? bridge.toIndex : bridge.fromIndex;
            pts.push(new THREE.Vector3(getPillarX(col, ladder.memberCount), y, 0));
        }
    }

    pts.push(new THREE.Vector3(getPillarX(col, ladder.memberCount), bottomY, 0));
    return pts;
}

function ActiveLightOrb({
    points,
    progress,
}: {
    points: THREE.Vector3[];
    progress: number;
}) {
    const orbRef = useRef<THREE.Mesh>(null);

    const { totalLength, segLengths } = useMemo(() => {
        const lengths: number[] = [];
        let total = 0;
        for (let i = 0; i < points.length - 1; i++) {
            const d = points[i].distanceTo(points[i + 1]);
            lengths.push(d);
            total += d;
        }
        return { totalLength: total, segLengths: lengths };
    }, [points]);

    useFrame(() => {
        if (!orbRef.current || totalLength <= 0) return;
        const targetDist = Math.max(0, Math.min(1, progress)) * totalLength;
        let acc = 0;
        for (let i = 0; i < segLengths.length; i++) {
            const len = segLengths[i];
            if (acc + len >= targetDist || i === segLengths.length - 1) {
                const t = len > 0 ? (targetDist - acc) / len : 0;
                orbRef.current.position.lerpVectors(points[i], points[i + 1], Math.min(1, Math.max(0, t)));
                break;
            }
            acc += len;
        }
    });

    return (
        <mesh ref={orbRef} position={points[0]}>
            <sphereGeometry args={[0.38, 24, 24]} />
            <meshBasicMaterial color="#ffe066" />
            <pointLight intensity={12} distance={8} color="#ffd700" />
        </mesh>
    );
}

function LadderMeshes({
    ladder,
    activeStartIndex,
    traceProgress,
}: WarikanScene3DProps) {
    const tracePoints = useMemo(() => {
        if (!ladder || activeStartIndex === null) return null;
        return buildTracePoints(ladder, activeStartIndex);
    }, [ladder, activeStartIndex]);

    if (!ladder) return null;

    return (
        <group position={[0, 0.5, 0]}>
            {/* 縦柱 */}
            {Array.from({ length: ladder.memberCount }, (_, i) => {
                const x = getPillarX(i, ladder.memberCount);
                const isActive = activeStartIndex === i;
                return (
                    <group key={`pillar-${i}`} position={[x, 0, 0]}>
                        <mesh>
                            <cylinderGeometry args={[0.07, 0.09, PILLAR_HEIGHT, 16]} />
                            <meshStandardMaterial
                                color={isActive ? "#ffe066" : "#a8d8ff"}
                                emissive={isActive ? "#ff9900" : "#1d6fe2"}
                                emissiveIntensity={isActive ? 1.8 : 0.9}
                                roughness={0.2}
                                metalness={0.7}
                            />
                        </mesh>
                        <Sparkles
                            count={10}
                            scale={[0.6, PILLAR_HEIGHT, 0.6]}
                            size={2.5}
                            speed={0.4}
                            opacity={0.5}
                            color={isActive ? "#ffe066" : "#ffffff"}
                        />
                    </group>
                );
            })}

            {/* 横線（ブリッジ） */}
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
                        <cylinderGeometry args={[0.045, 0.045, width, 12]} />
                        <meshStandardMaterial
                            color="#e0c3ff"
                            emissive="#8a4fff"
                            emissiveIntensity={1.1}
                            transparent
                            opacity={0.85}
                        />
                    </mesh>
                );
            })}

            {/* 降下する光の玉 */}
            {tracePoints && traceProgress > 0 && (
                <ActiveLightOrb points={tracePoints} progress={traceProgress} />
            )}
        </group>
    );
}

export default function WarikanScene3D({
    ladder,
    activeStartIndex,
    traceProgress,
}: WarikanScene3DProps) {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none">
            <Canvas
                camera={{ position: [0, 1.5, 17], fov: 55, far: 20000 }}
                dpr={[1, 1.5]}
                gl={{ antialias: true }}
            >
                <color attach="background" args={["#020412"]} />
                <ambientLight intensity={0.25} color="#cbdfff" />
                <pointLight position={[10, 12, 15]} intensity={1.5} color="#9ce0ff" />
                <pointLight position={[-10, -8, 12]} intensity={1.0} color="#ff9cdd" />

                <Stars
                    radius={100}
                    depth={50}
                    count={5000}
                    factor={4}
                    saturation={1}
                    fade
                    speed={0.8}
                />

                <React.Suspense fallback={null}>
                    <SolarSystem />
                </React.Suspense>

                <CosmicVortex />

                <LadderMeshes
                    ladder={ladder}
                    activeStartIndex={activeStartIndex}
                    traceProgress={traceProgress}
                />

                <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.25} />
            </Canvas>
        </div>
    );
}
