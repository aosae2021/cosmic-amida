"use client";

/**
 * MagicBridge.tsx
 * 横線（マジックブリッジ）コンポーネント。
 *
 * Phase 7: 円弧座標対応 + 初期可視化（半透明表示）。
 * カメラが近づいたら Bloom で完全発光するアニメーションを行う。
 * アンマウント時に geometry・material を dispose してメモリリークを防ぐ。
 */

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { useGameStore } from "../../hooks/useGameStore";
import type { Bridge } from "../../hooks/useGameStore";
import { pillarPositionOf } from "../../hooks/useAmidaLogic";
import { AMIDA_CONFIG } from "../../lib/amidaConfig";

const { layout, bridge: bridgeConfig } = AMIDA_CONFIG;

interface MagicBridgeProps {
    bridge: Bridge;
    levels: number;
}

export default function MagicBridge({ bridge, levels }: MagicBridgeProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);
    const sparklesRef = useRef<THREE.Points>(null);
    // 初期可視化: initiallyVisible なら初期値 0.6
    const initialReveal = bridgeConfig.initiallyVisible ? 0.6 : 0;
    const revealProgressRef = useRef(initialReveal);
    const { camera } = useThree();

    // 柱位置を取得
    const fromPos = pillarPositionOf(bridge.fromIndex);
    const toPos = pillarPositionOf(bridge.toIndex);

    // 中心座標
    const centerX = (fromPos.x + toPos.x) / 2;
    const centerZ = (fromPos.z + toPos.z) / 2;
    const levelHeight = layout.pillarHeight / (levels + 1);
    const y = layout.pillarHeight / 2 - (bridge.heightIndex + 1) * levelHeight + layout.pillarHeight;

    // 2柱間の実際の3D距離と方向
    const dx = toPos.x - fromPos.x;
    const dz = toPos.z - fromPos.z;
    const bridgeLength = Math.sqrt(dx * dx + dz * dz);

    // ブリッジのY軸回転（任意の2柱間を向くための角度）
    const bridgeAngle = Math.atan2(dx, dz) - Math.PI / 2;

    useFrame((state) => {
        if (!meshRef.current || !materialRef.current) return;

        const { phase } = useGameStore.getState();

        // カメラとの距離で出現を制御
        const dist = camera.position.distanceTo(
            new THREE.Vector3(centerX, y, centerZ)
        );

        // 選択後、または接近時に出現
        const isNear = dist < bridgeConfig.revealDistance;
        const isGameStarted = phase !== "selecting";

        if (isNear || (isGameStarted && bridgeConfig.initiallyVisible)) {
            revealProgressRef.current = Math.min(
                revealProgressRef.current + 0.04,
                isNear ? 1 : 0.4 // 接近時は 1.0, 選択後は 0.4 程度
            );
        }

        const p = revealProgressRef.current;
        const eased = p < 1 ? 1 + 2.7 * Math.pow(p - 1, 3) + 1.7 * Math.pow(p - 1, 2) : 1;

        meshRef.current.scale.y = Math.max(0.001, eased);
        materialRef.current.opacity = p;

        // パルス効果: 時間経過で emissiveIntensity を変化させる
        // カメラが近いほどパルスを強くする
        const pulseBase = 2.0 + Math.sin(state.clock.elapsedTime * 3 + bridge.heightIndex) * 1.5;
        materialRef.current.emissiveIntensity = pulseBase * (0.5 + p * 0.5);

        // シェーダーの time ユニフォームを更新
        if (materialRef.current.userData.shader) {
            materialRef.current.userData.shader.uniforms.time.value = state.clock.elapsedTime;
        }

        if (sparklesRef.current && sparklesRef.current.material instanceof THREE.Material) {
            sparklesRef.current.material.opacity = p * 0.8;
        }
    });

    useEffect(() => {
        return () => {
            meshRef.current?.geometry.dispose();
            if (materialRef.current) materialRef.current.dispose();
        };
    }, []);

    return (
        <group position={[centerX, y, centerZ]} rotation={[0, bridgeAngle, 0]}>
            <mesh ref={meshRef} scale={[1, bridgeConfig.initiallyVisible ? 1 : 0.001, 1]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.06, 0.06, bridgeLength, 8]} />
                <meshStandardMaterial
                    ref={materialRef}
                    color="#9ce0ff"
                    emissive="#3a7fd5"
                    emissiveIntensity={3}
                    transparent
                    opacity={initialReveal}
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
                            // 長手方向（vUv.y）に沿った流れ
                            float flow = sin(vUv.y * 5.0 - time * 6.0) * 0.5 + 0.5;
                            float streak = smoothstep(0.8, 1.0, flow);
                            totalEmissiveRadiance += totalEmissiveRadiance * streak * 3.0;
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
                {/* 橋の両端（コーナー）のスパーク光 */}
                <mesh position={[0, bridgeLength / 2, 0]}>
                    <sphereGeometry args={[0.15, 8, 8]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
                </mesh>
                <mesh position={[0, -bridgeLength / 2, 0]}>
                    <sphereGeometry args={[0.15, 8, 8]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
                </mesh>
            </mesh>
            <Sparkles
                ref={sparklesRef}
                count={15}
                scale={[bridgeLength, 0.5, 0.5]}
                size={4}
                speed={0.8}
                opacity={initialReveal * 0.8}
                color="#ffffff"
            />
        </group>
    );
}
