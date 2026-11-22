"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

/**
 * リアルな土星 (Realistic Cinematic Saturn)
 * 本体と環（Rings）で構成。自転軸の傾斜と影の落とし合いを実装。
 */

interface SaturnProps {
    position?: [number, number, number];
    scale?: number;
    rotation?: [number, number, number];
}

export default function Saturn({ position = [0, 0, 0], scale = 1, rotation = [0, 0, 0] }: SaturnProps) {
    const planetRef = useRef<THREE.Mesh>(null);
    const ringRef = useRef<THREE.Mesh>(null);

    // テクスチャの読み込み (本体のみ)
    const textures = useTexture({
        map: "/textures/saturn_surface.png",
    });

    // 輪のテクスチャを Canvas でプロシージャル（計算的）に生成
    // 実際の土星のハイレゾなテクスチャが見つからない場合や安定しない場合に確実な方法
    const ringTexture = useMemo(() => {
        const size = 1024;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        if (!context) return null;

        const center = size / 2;
        // リングのグラデーション (中心からの距離による色と透明度の変化)
        const gradient = context.createRadialGradient(center, center, 0, center, center, center);

        // 0.52 付近が RingGeometry(inner=1.4, outer=2.7) の内側エッジ (1.4 / 2.7 = 0.518)
        gradient.addColorStop(0.00, 'rgba(0,0,0,0)');
        gradient.addColorStop(0.51, 'rgba(0,0,0,0)');
        // Cリング (ぼんやり薄暗い)
        gradient.addColorStop(0.52, 'rgba(180, 160, 140, 0.1)');
        gradient.addColorStop(0.56, 'rgba(200, 180, 160, 0.4)');
        // Bリング (最も明るく分厚い)
        gradient.addColorStop(0.59, 'rgba(230, 210, 180, 0.9)');
        gradient.addColorStop(0.70, 'rgba(255, 240, 210, 0.95)');
        gradient.addColorStop(0.73, 'rgba(240, 220, 190, 0.9)');
        // カッシーニの間隙 (Cassini Division - 暗い隙間)
        gradient.addColorStop(0.74, 'rgba(0,0,0,0.1)');
        gradient.addColorStop(0.76, 'rgba(0,0,0,0.1)');
        // Aリング (外側のリング)
        gradient.addColorStop(0.77, 'rgba(220, 200, 170, 0.8)');
        gradient.addColorStop(0.89, 'rgba(210, 190, 160, 0.6)');
        // エンケの間隙 (Encke Gap - 細い隙間)
        gradient.addColorStop(0.90, 'rgba(0,0,0,0.0)');
        gradient.addColorStop(0.91, 'rgba(0,0,0,0.0)');
        // Aリング外縁
        gradient.addColorStop(0.92, 'rgba(200, 180, 150, 0.5)');
        gradient.addColorStop(0.96, 'rgba(180, 160, 130, 0.2)');
        gradient.addColorStop(1.00, 'rgba(0,0,0,0)');

        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);

        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 16;
        return tex;
    }, []);

    // 自転とアニメーション
    useFrame((_, delta) => {
        if (planetRef.current) {
            planetRef.current.rotation.y += delta * 0.1;
        }
    });

    // 土星の実際の軸の傾き (約26.7度)
    const tilt = THREE.MathUtils.degToRad(26.73);

    return (
        <group position={position} rotation={rotation} scale={scale}>
            {/* 土星本体 */}
            <mesh ref={planetRef} rotation={[tilt, 0, 0]} castShadow receiveShadow>
                <sphereGeometry args={[1, 64, 64]} />
                <meshStandardMaterial
                    map={textures.map}
                    roughness={0.8}
                    emissive="#443322"
                    metalness={0.2}
                />
            </mesh>

            {/* 土星の環 */}
            <mesh
                ref={ringRef}
                rotation={[Math.PI / 2 + tilt, 0, 0]}
                castShadow
                receiveShadow
            >
                {/* リングの幅を半分にする */}
                <ringGeometry args={[1.4, 2.7, 128]} />
                <meshStandardMaterial
                    map={ringTexture}
                    transparent={true}
                    opacity={0.9}
                    emissive="#ffccaa"
                    emissiveIntensity={1.5}
                    side={THREE.BackSide}
                    depthWrite={false}
                />
            </mesh>
            <mesh
                rotation={[Math.PI / 2 + tilt, 0, 0]}
                castShadow
                receiveShadow
            >
                <ringGeometry args={[1.4, 2.7, 128]} />
                <meshStandardMaterial
                    map={ringTexture}
                    transparent={true}
                    opacity={0.9}
                    emissive="#ffccaa"
                    emissiveIntensity={1.5}
                    side={THREE.FrontSide}
                    depthWrite={false}
                />
            </mesh>

            {/* 土星を前斜め上から照らすシネマティックなライト */}
            <pointLight
                intensity={500}
                distance={500}
                color="#fff5e6"
                position={[10, 5, 10]}
            />
        </group>
    );
}
