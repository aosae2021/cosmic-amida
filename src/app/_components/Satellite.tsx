"use client";

/**
 * Satellite.tsx
 * ユーザー指定の画像に基づくカスタム人工衛星モデル。
 * 箱型の本体、左右の巨大なソーラーパネル、パラボラアンテナで構成。
 */

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface SatelliteProps {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number | [number, number, number];
}

/** 巨大なソーラーパネル1枚（グリッド模様付き） */
function LargeSolarPanel({ position, rotation }: {
    position: [number, number, number];
    rotation?: [number, number, number];
}) {
    // パネルのグリッドテクスチャを生成
    const gridTexture = useMemo(() => {
        const canvas = document.createElement("canvas");
        // 解像度を高めにする
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext("2d")!;

        // ベースの深い青
        ctx.fillStyle = "#0a1a4a";
        ctx.fillRect(0, 0, 512, 256);

        // マイナーグリッド線（細いセル）
        ctx.strokeStyle = "#1e3b8a";
        ctx.lineWidth = 1;
        const minW = 512 / 64;
        const minH = 256 / 32;
        for (let x = 0; x <= 64; x++) {
            ctx.beginPath(); ctx.moveTo(x * minW, 0); ctx.lineTo(x * minW, 256); ctx.stroke();
        }
        for (let y = 0; y <= 32; y++) {
            ctx.beginPath(); ctx.moveTo(0, y * minH); ctx.lineTo(512, y * minH); ctx.stroke();
        }

        // メジャーグリッド線（太い区切り: 画像のように縦に5分割など）
        ctx.strokeStyle = "#cceeff";
        ctx.lineWidth = 4;
        const majW = 512 / 5;
        const majH = 256 / 2;
        for (let x = 0; x <= 5; x++) {
            ctx.beginPath(); ctx.moveTo(x * majW, 0); ctx.lineTo(x * majW, 256); ctx.stroke();
        }
        for (let y = 0; y <= 2; y++) {
            ctx.beginPath(); ctx.moveTo(0, y * majH); ctx.lineTo(512, y * majH); ctx.stroke();
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }, []);

    return (
        <mesh position={position} rotation={rotation}>
            {/* 横長で薄いパネル */}
            <boxGeometry args={[4.0, 0.05, 1.5]} />
            <meshStandardMaterial
                map={gridTexture}
                color="#3a5a9a"
                metalness={0.9}
                roughness={0.1}
                envMapIntensity={2.0}
            />
        </mesh>
    );
}

/** パラボラアンテナ */
function ParabolicAntenna({ position, rotation }: {
    position: [number, number, number];
    rotation?: [number, number, number];
}) {
    return (
        <group position={position} rotation={rotation}>
            {/* アンテナのメインディッシュ */}
            <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                {/* 浅いお椀型 */}
                <sphereGeometry args={[0.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 3]} />
                <meshStandardMaterial color="#cccccc" metalness={0.4} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>
            {/* 支柱 */}
            <mesh position={[0, 0.1, 0]}>
                <cylinderGeometry args={[0.05, 0.08, 0.2, 8]} />
                <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.4} />
            </mesh>
            {/* 中心から伸びる送受信棒 */}
            <mesh position={[0, 0.5, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
                <meshStandardMaterial color="#aaaaaa" metalness={0.9} roughness={0.2} />
            </mesh>
        </group>
    );
}

export default function Satellite({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: SatelliteProps) {
    const groupRef = useRef<THREE.Group>(null);

    // ゆっくり自転させる
    useFrame((_, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += delta * 0.1;
            groupRef.current.rotation.x -= delta * 0.05;
        }
    });

    return (
        <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
            {/* --- 本体（メインボディ） --- */}
            <mesh>
                {/* 箱型の本体 */}
                <boxGeometry args={[1.5, 1.5, 1.5]} />
                <meshStandardMaterial
                    color="#e0e0e0"
                    metalness={0.6}
                    roughness={0.4}
                />
            </mesh>

            {/* --- 装飾パーツ（メカニカルなディテール） --- */}
            {/* 金色のサーマルブランケット風の側面 */}
            <mesh position={[0, 0, 0.76]}>
                <planeGeometry args={[1.2, 1.2]} />
                <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0, -0.76]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[1.2, 1.2]} />
                <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.3} />
            </mesh>

            {/* 上部の機器パネル */}
            <mesh position={[0, 0.8, 0]}>
                <boxGeometry args={[1.0, 0.1, 1.0]} />
                <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.5} />
            </mesh>

            {/* 下部のスラスター */}
            <mesh position={[0, -0.85, 0]}>
                <cylinderGeometry args={[0.3, 0.4, 0.2, 16]} />
                <meshStandardMaterial color="#333333" metalness={0.7} roughness={0.8} />
            </mesh>

            {/* --- ソーラーパネル --- */}
            {/* ソーラーパネルを支える左右のトラス（腕） */}
            <mesh position={[-1.75, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.1, 0.1, 2.0, 8]} />
                <meshStandardMaterial color="#aaaaaa" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[1.75, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.1, 0.1, 2.0, 8]} />
                <meshStandardMaterial color="#aaaaaa" metalness={0.8} roughness={0.3} />
            </mesh>

            {/* 左のソーラーパネル */}
            <LargeSolarPanel position={[-4.75, 0, 0]} rotation={[0.2, 0, 0]} />

            {/* 右のソーラーパネル */}
            <LargeSolarPanel position={[4.75, 0, 0]} rotation={[-0.2, 0, 0]} />

            {/* --- アンテナ --- */}
            {/* 側面を向いた大きなパラボラアンテナ */}
            <ParabolicAntenna position={[0, 0, 0.75]} rotation={[Math.PI / 2, 0, 0]} />

            {/* 上面の小型アンテナ */}
            <mesh position={[-0.4, 0.85, -0.3]}>
                <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
                <meshStandardMaterial color="#cccccc" metalness={0.9} roughness={0.1} />
            </mesh>

            {/* 右側面のロッドアンテナ */}
            <mesh position={[0.75, 0.5, 0]} rotation={[0, 0, -Math.PI / 4]}>
                <cylinderGeometry args={[0.02, 0.02, 1.0, 8]} />
                <meshStandardMaterial color="#999999" metalness={0.8} roughness={0.2} />
            </mesh>
        </group>
    );
}
