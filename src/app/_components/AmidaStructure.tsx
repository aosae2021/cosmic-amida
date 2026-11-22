"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles, Html } from "@react-three/drei";
import * as THREE from "three";
import { AMIDA_CONFIG } from "../../lib/amidaConfig";
import { pillarPositionOf } from "../../hooks/useAmidaLogic";
import MagicBridge from "./MagicBridge";
import type { Bridge } from "../../hooks/useGameStore";

const { layout } = AMIDA_CONFIG;

interface AmidaStructureProps {
    bridges: Bridge[];
    levels: number;
    pillarLabels: string[];
}

/** あみだ柱（クリスタルピラー）*/
function CrystalPillar({ x, z, label }: { x: number; z: number; label: string }) {
    const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);

    useFrame((state) => {
        if (materialRef.current) {
            // 時間経過で emissiveIntensity を 1.0 ~ 1.8 の間で脈動させる
            const pulse = 1.4 + Math.sin(state.clock.elapsedTime * 2) * 0.4;
            materialRef.current.emissiveIntensity = pulse;
            // シェーダーの time ユニフォームを更新
            if (materialRef.current.userData.shader) {
                materialRef.current.userData.shader.uniforms.time.value = state.clock.elapsedTime;
            }
        }
    });

    return (
        <group position={[x, layout.pillarHeight, z]}>
            <mesh>
                <cylinderGeometry args={[0.08, 0.12, layout.pillarHeight, 16]} />
                <meshPhysicalMaterial
                    ref={materialRef}
                    color="#e0f0ff"
                    emissive="#1a5fb4"
                    emissiveIntensity={1.2}
                    transparent
                    opacity={0.9}
                    roughness={0.05}
                    metalness={0.8}
                    transmission={0.9}
                    thickness={0.5}
                    ior={1.5}
                    clearcoat={1}
                    clearcoatRoughness={0.1}
                    onBeforeCompile={(shader) => {
                        shader.uniforms.time = { value: 0 };
                        shader.fragmentShader = shader.fragmentShader.replace(
                            `#include <common>`,
                            `#include <common>
                            uniform float time;
                            varying vec2 vUv;`
                        ).replace(
                            `#include <emissivemap_fragment>`,
                            `#include <emissivemap_fragment>
                            float pulse = sin(vUv.y * 10.0 - time * 4.0) * 0.5 + 0.5;
                            float scanline = smoothstep(0.45, 0.5, pulse) * smoothstep(0.55, 0.5, pulse);
                            totalEmissiveRadiance += totalEmissiveRadiance * scanline * 2.0;
                            `
                        );
                        shader.vertexShader = shader.vertexShader.replace(
                            `#include <common>`,
                            `#include <common>
                            varying vec2 vUv;`
                        ).replace(
                            `#include <uv_vertex>`,
                            `#include <uv_vertex>
                            vUv = uv;`
                        );
                        materialRef.current!.userData.shader = shader;
                    }}
                />
            </mesh>
            {/* 柱にまとわりつくキラキラ */}
            <Sparkles
                count={20}
                scale={[0.8, layout.pillarHeight, 0.8]}
                size={3}
                speed={0.4}
                opacity={0.6}
                color="#ffffff"
            />
            {/* 結果テキスト */}
            <Html position={[0, -layout.pillarHeight / 2 - 1.5, 0]} center zIndexRange={[100, 80]}>
                <div style={{
                    background: "rgba(0,0,0,0.6)",
                    padding: "4px 12px",
                    borderRadius: "8px",
                    color: "#fff",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                    border: "1px solid rgba(255,255,255,0.3)",
                }}>
                    {label}
                </div>
            </Html>
        </group>
    );
}

export default function AmidaStructure({ bridges, levels, pillarLabels }: AmidaStructureProps) {
    // 柱の円弧座標一覧
    const pillarPositions = useMemo(() => {
        return Array.from({ length: layout.pillarCount }, (_, i) =>
            pillarPositionOf(i)
        );
    }, []);

    return (
        <>
            {/* クリスタル柱（円弧配置） */}
            {pillarPositions.map((pos, i) => (
                <CrystalPillar key={i} x={pos.x} z={pos.z} label={pillarLabels[i]} />
            ))}

            {/* 横線（マジックブリッジ） */}
            {bridges.map((bridge, i) => (
                <MagicBridge key={i} bridge={bridge} levels={levels} />
            ))}
        </>
    );
}
