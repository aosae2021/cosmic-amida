"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Points, PointMaterial } from "@react-three/drei";

/**
 * 写真のような超リアルな巨大彗星 (Realistic Majestic Comet)
 * 核(Nucleus)、コマ(Coma)、強烈な青白く輝くプラズマ＆ダストテイルを表現します。
 */

interface CometProps {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number | [number, number, number];
}

export default function Comet({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: CometProps) {
    const groupRef = useRef<THREE.Group>(null);
    const comaRef = useRef<THREE.Mesh>(null);

    // 玉(Coma)の直径に基づき、尾の生成を管理する
    const comaRadius = 0.5;

    // 写真のような太く、青白い、筋の入った直線的な尾 (Striated Blue Tail)
    const tailCount = 250000;
    const { tailPositions, tailColors } = useMemo(() => {
        const positions = new Float32Array(tailCount * 3);
        const colors = new Float32Array(tailCount * 3);
        const tailLength = 135; // 1.5倍に延長
        const colorBase = new THREE.Color("#4488ff"); // ベース色

        for (let i = 0; i < tailCount; i++) {
            const zPct = Math.pow(Math.random(), 1.5);
            const z = zPct * tailLength;

            const streakAngle = (Math.floor(Math.random() * 8) / 8) * Math.PI * 2;
            const spread = comaRadius + (z / tailLength) * 12.0;
            const r = Math.random() * spread;

            const x = Math.cos(streakAngle) * r + (Math.random() - 0.5) * spread * 0.3;
            const y = Math.sin(streakAngle) * r * 0.5 + (Math.random() - 0.5) * spread * 0.3;

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            // Z距離に応じて色を黒へフェードアウトさせる
            const fadeFactor = Math.max(0, 1.0 - (z / tailLength));
            colors[i * 3] = colorBase.r * fadeFactor;
            colors[i * 3 + 1] = colorBase.g * fadeFactor;
            colors[i * 3 + 2] = colorBase.b * fadeFactor;
        }
        return { tailPositions: positions, tailColors: colors };
    }, []);

    // フォグ/ヘイズレイヤー（もやのかかった拡散光）
    const fogCount = 80000;
    const { fogPositions, fogColors } = useMemo(() => {
        const positions = new Float32Array(fogCount * 3);
        const colors = new Float32Array(fogCount * 3);
        const tailLength = 240; // フォグは更に奥まで延びる
        const colorBase = new THREE.Color("#6699ff");

        for (let i = 0; i < fogCount; i++) {
            const zPct = Math.pow(Math.random(), 1.2);
            const z = zPct * tailLength;

            // 広範囲に拡散するもやっぽい分布
            const spread = comaRadius * 3 + (z / tailLength) * 28.0;
            const x = (Math.random() - 0.5) * spread;
            const y = (Math.random() - 0.5) * spread * 0.6;

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            // 奥に行くほど薄く
            const fadeFactor = Math.max(0, 1.0 - Math.pow(z / tailLength, 0.7));
            colors[i * 3] = colorBase.r * fadeFactor;
            colors[i * 3 + 1] = colorBase.g * fadeFactor;
            colors[i * 3 + 2] = colorBase.b * fadeFactor;
        }
        return { fogPositions: positions, fogColors: colors };
    }, []);

    // 中心部の最も明るい白〜水色のコアテイル (Core Tail)
    const coreTailCount = 100000;
    const { coreTailPositions, coreTailColors } = useMemo(() => {
        const positions = new Float32Array(coreTailCount * 3);
        const colors = new Float32Array(coreTailCount * 3);
        const tailLength = 90; // 1.5倍に延長
        const colorBase = new THREE.Color("#ffffff");

        for (let i = 0; i < coreTailCount; i++) {
            const zPct = Math.pow(Math.random(), 2.0);
            const z = zPct * tailLength;

            const spread = comaRadius * 0.8 + (z / tailLength) * 2.0;
            const x = (Math.random() - 0.5) * spread;
            const y = (Math.random() - 0.5) * spread;

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            // Z距離に応じて色を黒へフェードアウト
            const fadeFactor = Math.max(0, 1.0 - (z / tailLength));
            colors[i * 3] = colorBase.r * fadeFactor;
            colors[i * 3 + 1] = colorBase.g * fadeFactor;
            colors[i * 3 + 2] = colorBase.b * fadeFactor;
        }
        return { coreTailPositions: positions, coreTailColors: colors };
    }, []);

    // ソフトパーティクル用テクスチャの生成
    const particleTexture = useMemo(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const context = canvas.getContext("2d");
        if (context) {
            const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
            gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
            gradient.addColorStop(0.4, "rgba(255, 255, 255, 0.8)");
            gradient.addColorStop(0.8, "rgba(255, 255, 255, 0.1)");
            gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
            context.fillStyle = gradient;
            context.fillRect(0, 0, 32, 32);
        }
        return new THREE.CanvasTexture(canvas);
    }, []);

    useFrame((state) => {
        if (!groupRef.current) return;

        if (comaRef.current) {
            const pulse = 1.0 + Math.sin(state.clock.elapsedTime * 15) * 0.02;
            comaRef.current.scale.set(pulse, pulse, pulse);
        }
    });

    return (
        <group ref={groupRef} position={position} rotation={rotation} scale={scale}>

            {/* 核 (Nucleus) */}
            <mesh>
                <sphereGeometry args={[comaRadius * 0.3, 16, 16]} />
                <meshStandardMaterial
                    color="#ffffff"
                    emissive="#ffffff"
                    emissiveIntensity={10}
                />
            </mesh>

            {/* コマ (Coma) - 先頭の青い玉、サイズを今の0.7倍 */}
            <mesh ref={comaRef}>
                <sphereGeometry args={[comaRadius * 2.5 * 0.7, 32, 32]} />
                <meshStandardMaterial
                    color="#ddffff"
                    emissive="#44aaff"
                    emissiveIntensity={4}
                    transparent
                    opacity={0.6}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
                <pointLight intensity={500} distance={800} color="#88ddff" />
            </mesh>

            {/* ハロ (Halo) */}
            <mesh>
                <sphereGeometry args={[comaRadius * 8, 32, 32]} />
                <meshStandardMaterial
                    color="#1133aa"
                    emissive="#1155ff"
                    emissiveIntensity={1}
                    transparent
                    opacity={0.15}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    side={THREE.BackSide}
                />
            </mesh>

            {/* コアテイル (Core Tail) - パーティクルをさらに微細化 */}
            <Points positions={coreTailPositions} colors={coreTailColors}>
                <PointMaterial
                    map={particleTexture}
                    transparent
                    opacity={0.8}
                    size={0.15 * 1.5}
                    sizeAttenuation={true}
                    vertexColors={true}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </Points>

            {/* メインテイル (Main Tail) - パーティクルをさらに微細化 */}
            <Points positions={tailPositions} colors={tailColors}>
                <PointMaterial
                    map={particleTexture}
                    transparent
                    opacity={0.4}
                    size={0.35 * 1.5}
                    sizeAttenuation={true}
                    vertexColors={true}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </Points>

            {/* フォグレイヤー (Fog/Haze) - もやがかかった拡散光  */}
            <Points positions={fogPositions} colors={fogColors}>
                <PointMaterial
                    map={particleTexture}
                    transparent
                    opacity={0.12}
                    size={1.8 * 1.5}
                    sizeAttenuation={true}
                    vertexColors={true}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </Points>

        </group>
    );
}
