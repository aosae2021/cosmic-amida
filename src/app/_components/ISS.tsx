"use client";

/**
 * ISS.tsx
 * 国際宇宙ステーション風の3Dモデル（GLB不要・パーツ組み立て式）。
 * 中央モジュール、グリッド付きソーラーパネル×4、点滅ランプで構成。
 */

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ISSProps {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number | [number, number, number];
}

/** ソーラーパネル1枚（セルのグリッド線付き） */
function SolarPanel({ position, rotation }: {
    position: [number, number, number];
    rotation?: [number, number, number];
}) {
    // パネルのグリッドテクスチャを生成
    const gridTexture = useMemo(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 128; // アスペクト比に合わせる
        const ctx = canvas.getContext("2d")!;

        // ベースの濃紺（宇宙用ソーラーパネル風）
        ctx.fillStyle = "#020b22";
        ctx.fillRect(0, 0, 256, 128);

        // マイナーグリッド線（細いセル）
        ctx.strokeStyle = "#1a3b7a";
        ctx.lineWidth = 1;
        const minW = 256 / 32;
        const minH = 128 / 8;
        for (let x = 0; x <= 32; x++) {
            ctx.beginPath(); ctx.moveTo(x * minW, 0); ctx.lineTo(x * minW, 128); ctx.stroke();
        }
        for (let y = 0; y <= 8; y++) {
            ctx.beginPath(); ctx.moveTo(0, y * minH); ctx.lineTo(256, y * minH); ctx.stroke();
        }

        // メジャーグリッド線（太い区切り: 画像のように8列×2行）
        ctx.strokeStyle = "#cceeff";
        ctx.lineWidth = 3;
        const majW = 256 / 8;
        const majH = 128 / 2;
        for (let x = 0; x <= 8; x++) {
            ctx.beginPath(); ctx.moveTo(x * majW, 0); ctx.lineTo(x * majW, 128); ctx.stroke();
        }
        for (let y = 0; y <= 2; y++) {
            ctx.beginPath(); ctx.moveTo(0, y * majH); ctx.lineTo(256, y * majH); ctx.stroke();
        }

        // ハイライト（反射）
        ctx.fillStyle = "rgba(100, 180, 255, 0.15)";
        ctx.fillRect(0, 0, 128, 64);

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }, []);

    return (
        <mesh position={position} rotation={rotation}>
            <boxGeometry args={[1.8, 0.025, 0.7]} />
            <meshStandardMaterial
                map={gridTexture}
                emissiveMap={gridTexture}
                color="#2a4a7a"
                emissive="#ffffff"
                emissiveIntensity={1.2}
                metalness={0.85}
                roughness={0.15}
            />
        </mesh>
    );
}

/** 点滅する航行ランプ */
function BlinkingLight({ position, color = "#8b1a1a" }: {
    position: [number, number, number];
    color?: string;
}) {
    const meshRef = useRef<THREE.Mesh>(null);
    const lightRef = useRef<THREE.PointLight>(null);

    useFrame((state) => {
        // sin波で点滅 (0～1をパルス的に)
        const t = state.clock.elapsedTime;
        // 1.2秒周期で smooth pulse
        const pulse = Math.pow(Math.sin(t * 2.6) * 0.5 + 0.5, 3);

        if (meshRef.current) {
            const mat = meshRef.current.material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity = 0.5 + pulse * 4;
        }
        if (lightRef.current) {
            lightRef.current.intensity = pulse * 5;
        }
    });

    return (
        <group position={position}>
            <mesh ref={meshRef}>
                <sphereGeometry args={[0.04, 8, 8]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={2}
                    toneMapped={false}
                />
            </mesh>
            <pointLight
                ref={lightRef}
                color={color}
                intensity={3}
                distance={2}
                decay={2}
            />
        </group>
    );
}

export default function ISS({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: ISSProps) {
    const groupRef = useRef<THREE.Group>(null);

    // わずかに漂うように自転させる
    useFrame((_, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.y -= delta * 0.05;
            groupRef.current.rotation.z += delta * 0.02;
        }
    });

    return (
        <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
            {/* 中央モジュール（本体） */}
            <mesh>
                <boxGeometry args={[0.8, 0.4, 0.4]} />
                <meshStandardMaterial
                    color="#cccccc"
                    emissive="#222233"
                    emissiveIntensity={0.3}
                    metalness={0.8}
                    roughness={0.3}
                />
            </mesh>

            {/* 前方モジュール */}
            <mesh position={[0, 0, -0.35]}>
                <boxGeometry args={[0.35, 0.3, 0.3]} />
                <meshStandardMaterial
                    color="#bbbbbb"
                    emissive="#1a1a2a"
                    emissiveIntensity={0.2}
                    metalness={0.7}
                    roughness={0.4}
                />
            </mesh>

            {/* ソーラーパネル（左上） */}
            <SolarPanel position={[-1.6, 0.06, 0]} />
            {/* ソーラーパネル（右上） */}
            <SolarPanel position={[1.6, 0.06, 0]} />
            {/* ソーラーパネル（左下） */}
            <SolarPanel position={[-1.6, -0.06, 0]} rotation={[0, 0, 0.04]} />
            {/* ソーラーパネル（右下） */}
            <SolarPanel position={[1.6, -0.06, 0]} rotation={[0, 0, -0.04]} />

            {/* トラス構造（横棒） */}
            <mesh>
                <boxGeometry args={[4.5, 0.06, 0.06]} />
                <meshStandardMaterial
                    color="#999999"
                    metalness={0.9}
                    roughness={0.2}
                />
            </mesh>

            {/* 接続アーム（縦） */}
            <mesh position={[0, 0, 0.3]}>
                <cylinderGeometry args={[0.06, 0.06, 0.5, 6]} />
                <meshStandardMaterial color="#aaaaaa" metalness={0.7} roughness={0.3} />
            </mesh>

            {/* 点滅ランプ（シックな暗赤） */}
            <BlinkingLight position={[0.35, 0.22, 0]} color="#8b1a1a" />
            <BlinkingLight position={[-0.35, 0.22, 0]} color="#8b1a1a" />
            {/* 反対側にも（緑ランプ 航行灯風） */}
            <BlinkingLight position={[0, -0.22, 0.2]} color="#1a5c3a" />
        </group>
    );
}
