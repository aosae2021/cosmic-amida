"use client"; 

/**
 * SolarSystem.tsx
 * あみだくじの背景を彩る太陽系の惑星群。
 * テクスチャ画像への依存をなくし、標準のジオメトリとマテリアルでスタイライズド（ローポリ風）に表現。
 */

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, OrbitControls, useGLTF, Text, Billboard, useTexture, Environment } from "@react-three/drei";
import * as THREE from "three";
import ISS from "./ISS";
import Satellite from "./Satellite";
import Comet from "./Comet";
import StarfieldBackground from "./StarfieldBackground";
import RealisticSun from "./RealisticSun";
import Galaxy from "./Galaxy";
import Saturn from "./Saturn";

const BACKGROUND_GALAXIES = [
    { position: [0, -200, -2500] as [number, number, number], rotation: [-0.2, 0, 0] as [number, number, number], scale: 1.0 }, // 後方
    { position: [1500, 800, 500] as [number, number, number], rotation: [0.5, 0.2, 0.4] as [number, number, number], scale: 0.8 }, // 右上・手前
    { position: [-1800, -1000, 1200] as [number, number, number], rotation: [-0.4, 0.8, -0.2] as [number, number, number], scale: 1.2 }, // 左下・手前
];

// ... (rest of helper components)

/**
 * 地球の大気の光輪（フレア）
 */
const EarthAtmosphere = ({ radius }: { radius: number }) => {
    return (
        <mesh>
            <sphereGeometry args={[radius * 1.05, 64, 64]} />
            <meshStandardMaterial
                color="#4488ff"
                transparent
                opacity={0.2}
                side={THREE.BackSide}
                blending={THREE.AdditiveBlending}
            />
        </mesh>
    );
};

/**
 * 地球の雲レイヤー
 */
const EarthClouds = ({ radius, cloudTexture }: { radius: number; cloudTexture: THREE.Texture }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame((_, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.03;
        }
    });

    return (
        <mesh ref={meshRef}>
            <sphereGeometry args={[radius * 1.015, 64, 64]} />
            <meshStandardMaterial
                alphaMap={cloudTexture}
                transparent
                opacity={0.4}
                depthWrite={false}
            />
        </mesh>
    );
};

export default function SolarSystem() {
    const groupRef = useRef<THREE.Group>(null);
    const isDev = process.env.NODE_ENV === 'development';

    // 惑星全体をゆっくり回転させる（開発環境では無効化してLeva調整を正確に行う）
    useFrame((_, delta) => {
        if (groupRef.current && !isDev) {
            groupRef.current.rotation.y += delta * 0.02;
        }
    });

    // リアルなテクスチャの読み込み (Three.js 公式サンプルの安定したURLを使用)
    const textures = useTexture({
        earth: "https://threejs.org/examples/textures/planets/earth_day_4096.jpg",
        night: "https://threejs.org/examples/textures/planets/earth_night_4096.jpg",
        normal: "https://threejs.org/examples/textures/planets/earth_normal_2048.jpg",
        specular: "https://threejs.org/examples/textures/planets/earth_specular_2048.jpg",
        clouds: "https://threejs.org/examples/textures/planets/earth_clouds_1024.png",
        moon: "https://threejs.org/examples/textures/planets/moon_1024.jpg",
    });

    // テクスチャ設定の微調整
    if (textures.night) {
        textures.night.colorSpace = THREE.SRGBColorSpace;
    }

    return (
        <>
        <group ref={groupRef}>
            {/* ISS - あみだと地球の間、太陽光が当たる明るい位置に配置 (さらに遠方へ 1.25倍) */}
            {/* ISS - 地球からの距離を現在の0.5倍にした位置 */}
            <ISS position={[63.2, -30.6, -75.2]} scale={8.0} rotation={[0.3, 0.5, -0.1]} />
            {/* ISSを照らす専用ライト (ISSに合わせて位置を調整) */}
            <pointLight position={[23.4, 15.6, -23.4]} intensity={80} distance={50} color="#fffbe6" />

            {/* 環境光とリフレクション */}
            <Environment preset="night" />

            {/* シネマティックな空間全体を照らす指向性ライト (大幅に抑制) */}
            <directionalLight position={[-800, 400, -1200]} intensity={0.5} color="#fffbe6" castShadow />
            <ambientLight intensity={0.005} color="#0a0a2a" />
            
            {/* モデルを正面から照らす補完ライト (WoW演出用) */}
            <pointLight position={[50, 100, 200]} intensity={200} color="#ffffff" distance={1000} />
            <pointLight position={[-150, 150, 200]} intensity={150} color="#9ce0ff" distance={1000} />

            {/* ボリュームスターフィールド背景 */}
            <StarfieldBackground />

            {/* 太陽: 眩しい光を放つ中心星 - さらに遠方へ配置しサイズを縮小 */}
            <RealisticSun position={[-800, 300, -1400]} radius={60} />

            {/* 巨大な銀河を遥か遠方に3個配置 */}
            {BACKGROUND_GALAXIES.map((gProps, i) => (
                <group key={i} position={gProps.position} rotation={gProps.rotation} scale={gProps.scale}>
                    <Galaxy />
                </group>
            ))}

            {/* 地球: 画面右下に大迫力で配置 (0.8倍に見えるようさらに1.25倍遠方へ) */}
            {/* 地球 - あみだとの距離を今の1.3倍に配置 */}
            <group position={[112.1, -91, -121.8]} scale={12} rotation={[0.4, -0.2, 0]}>
                <mesh>
                    <sphereGeometry args={[4, 64, 64]} />
                    <meshStandardMaterial
                        map={textures.earth}
                        emissiveMap={textures.night}
                        emissive="#ffffff"
                        emissiveIntensity={0.5}
                        normalMap={textures.normal}
                        normalScale={new THREE.Vector2(0.5, 0.5)}
                        roughnessMap={textures.specular}
                        metalness={0.1}
                        roughness={0.8}
                    />
                </mesh>
                <EarthClouds radius={4} cloudTexture={textures.clouds} />
                <EarthAtmosphere radius={4} />

                {/* 地球を公転する月 */}
                <group ref={(moonOrbitRef) => {
                    // 月が地球の周りを公転するアニメーション
                    if (moonOrbitRef) {
                        const animate = () => {
                            moonOrbitRef.rotation.y += 0.001;
                            requestAnimationFrame(animate);
                        };
                        animate();
                    }
                }}>
                    <mesh position={[-6, 1.5, -8]}> {/* 地球からの相対位置 */}
                        <sphereGeometry args={[0.3, 32, 32]} /> {/* 地球スケールのさらに子要素なので小さめ */}
                        <meshStandardMaterial
                            map={textures.moon}
                            color="#cccccc"
                            roughness={0.9}
                            metalness={0.0}
                        />
                    </mesh>
                </group>

                <EarthAtmosphere radius={4} />
            </group>

            {/* 小さい方の人工衛星 - 地球から離して配置（地球の右側・より遠く） */}
            <Satellite position={[195.0, -70.0, -93.7]} scale={6.0} rotation={[-0.3, 0.4, 0.2]} />

            {/* 巨大彗星 (Majestic Cinematic Comet) */}
            {/* 太陽（左奥）と重ならないよう、画面右上のエリア（地球の対角）へ配置 */}
            <Comet position={[300, 120, -500]} scale={8.0} rotation={[0.4, -0.8, -0.3]} />

            {/* 圧倒的な存在感の土星 (Cinematic Saturn) - あみだより下の位置に配置 */}
            {/* 土星 - あみだから見て右に10度移動した位置 */}
            <Saturn position={[156.5, -50.625, 109.5]} scale={12.0} rotation={[0.2, -0.4, 0.3]} />

        </group>
        </>

    );
}
