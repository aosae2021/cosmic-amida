"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Ultimate Spiral Galaxy Shader
 * 頂点シェーダーとフラグメントシェーダーを使用して、密度感のある幻想的な銀河を表現します。
 */
const galaxyVertexShader = `
uniform float uTime;
uniform float uSize;

attribute float aScale;
attribute vec3 aRandomness;
attribute float aDust;
attribute float aLuminosity;

varying vec3 vColor;
varying float vDust;
varying float vLuminosity;

void main() {
    vColor = color;
    vDust = aDust;
    vLuminosity = aLuminosity;

    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    // 回転アニメーション (銀河の自転)
    float distanceToCenter = length(modelPosition.xz);
    float angle = atan(modelPosition.x, modelPosition.z);
    
    // 差動回転 (中心に近いほど速く回転)
    float angleOffset = (1.0 / (distanceToCenter * 0.05 + 1.0)) * uTime * 0.15;
    angle += angleOffset;

    modelPosition.x = cos(angle) * distanceToCenter;
    modelPosition.z = sin(angle) * distanceToCenter;

    // 乱雑さを加算（三次元的な広がり）
    modelPosition.xyz += aRandomness;

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    // サイズ調整 (遠近法 + ルミノシティ)
    // 輝度（aLuminosity）が高いほど、大きく見せて Bloom を誘発
    gl_PointSize = uSize * aScale * (350.0 / -viewPosition.z) * (1.0 + vLuminosity * 0.4);
}
`;

const galaxyFragmentShader = `
varying vec3 vColor;
varying float vDust;
varying float vLuminosity;

void main() {
    float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
    float strength = 1.0 - (distanceToCenter * 2.0);
    strength = pow(strength, 3.0); // 柔らかな光の粒

    if (strength < 0.01) discard;

    // ダストレーン (光の吸収) と輝度の適用
    vec3 finalColor = vColor * (1.0 - vDust * 0.75) * vLuminosity;
    
    gl_FragColor = vec4(finalColor, strength);
}
`;

interface RealisticGalaxyProps {
    count?: number;
    radius?: number;
    branches?: number;
    spin?: number;
    insideColor?: string;
    outsideColor?: string;
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
    size?: number;
    isElliptical?: boolean;
}

const RealisticGalaxy = ({
    count = 150000,
    radius = 450,
    branches = 3,
    spin = 1.0,
    insideColor = '#fff5db', // 暖色系の中心
    outsideColor = '#0066ff', // 寒色系の腕
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1,
    size = 1.0,
    isElliptical = false
}: RealisticGalaxyProps) => {
    const pointsRef = useRef<THREE.Points>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    const { positions, colors, scales, randomness, dust, luminosity } = useMemo(() => {
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const scales = new Float32Array(count);
        const randomness = new Float32Array(count * 3);
        const dust = new Float32Array(count);
        const luminosity = new Float32Array(count);

        const colorInside = new THREE.Color(insideColor);
        const colorOutside = new THREE.Color(outsideColor);

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;

            // 1. 半径 (中心ほど密度を高くする)
            const rRatio = Math.pow(Math.random(), 2.5);
            const r = rRatio * radius;

            // 2. 螺旋の角度計算
            let angle = 0;
            if (isElliptical) {
                angle = Math.random() * Math.PI * 2;
            } else {
                const branchAngle = ((i % branches) / branches) * Math.PI * 2;
                angle = branchAngle + rRatio * spin * Math.PI * 2;
            }

            // 3. Bruno Simon 氏の数式に基づく "spread" (散らばり) の再現
            // x = cos(angle + spread) * radius
            // z = sin(angle + spread) * radius
            const randomSpread = Math.pow(Math.random(), 3.5) * (Math.random() < 0.5 ? 1 : -1) * 0.2;
            const spread = randomSpread / (rRatio + 0.1); // 外側ほど広がる

            positions[i3] = Math.cos(angle + spread) * r;
            positions[i3 + 1] = 0;
            positions[i3 + 2] = Math.sin(angle + spread) * r;

            // 4. 厚みと乱雑さ
            const thickness = 0.12 * (1.0 - rRatio * 0.8);
            randomness[i3] = (Math.random() - 0.5) * radius * 0.04;
            randomness[i3 + 1] = (Math.random() - 0.5) * radius * thickness;
            randomness[i3 + 2] = (Math.random() - 0.5) * radius * 0.04;

            // 5. ダストレーン (腕の間に暗い影)
            if (!isElliptical) {
                const dustPattern = Math.sin(angle * branches - rRatio * 12.0);
                dust[i] = dustPattern > 0.45 ? 1.0 : 0.0;
            } else {
                dust[i] = 0;
            }

            // 6. カラーグラデーション (暖色コア -> 寒色アーム)
            // コアに近いほど insideColor、遠いほど outsideColor
            const colorMix = Math.min(1.0, rRatio * 1.5);
            const mixedColor = colorInside.clone().lerp(colorOutside, colorMix);

            // 星の個性のためのノイズ
            colors[i3] = THREE.MathUtils.clamp(mixedColor.r + (Math.random() - 0.5) * 0.1, 0, 1);
            colors[i3 + 1] = THREE.MathUtils.clamp(mixedColor.g + (Math.random() - 0.5) * 0.1, 0, 1);
            colors[i3 + 2] = THREE.MathUtils.clamp(mixedColor.b + (Math.random() - 0.5) * 0.1, 0, 1);

            // 7. 輝度 (コア重視 + 輝点)
            const baseLum = (1.1 - rRatio) * 1.2;
            const starBurst = Math.random() > 0.99 ? 4.0 : 0.7;
            luminosity[i] = baseLum * starBurst;

            // 8. 個別スケール
            scales[i] = Math.random() * 0.7 + 0.2;
        }

        return { positions, colors, scales, randomness, dust, luminosity };
    }, [count, radius, branches, spin, insideColor, outsideColor, isElliptical]);

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uSize: { value: size },
    }), [size]);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        }
    });

    return (
        <points ref={pointsRef} position={position} rotation={rotation} scale={scale}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
                <bufferAttribute attach="attributes-color" args={[colors, 3]} />
                <bufferAttribute attach="attributes-aScale" args={[scales, 1]} />
                <bufferAttribute attach="attributes-aRandomness" args={[randomness, 3]} />
                <bufferAttribute attach="attributes-aDust" args={[dust, 1]} />
                <bufferAttribute attach="attributes-aLuminosity" args={[luminosity, 1]} />
            </bufferGeometry>
            <shaderMaterial
                ref={materialRef}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                vertexColors={true}
                transparent={true}
                vertexShader={galaxyVertexShader}
                fragmentShader={galaxyFragmentShader}
                uniforms={uniforms}
            />
        </points>
    );
};

export default function Galaxy() {
    return (
        <group>
            {/* メイン: レンズ状銀河（円盤型） */}
            <RealisticGalaxy
                count={150000}
                radius={480}
                isElliptical={true} // 円盤型に
                insideColor="#fffbe0"
                outsideColor="#4d88ff"
                position={[0, 0, 0]}
                rotation={[1.2, -0.4, 0.4]}
                scale={1}
                size={0.8}
            />

            {/* M32 風 伴銀河 */}
            <RealisticGalaxy
                count={35000}
                radius={150}
                isElliptical={true}
                insideColor="#ffebcc"
                outsideColor="#d9e6ff"
                position={[-320, 240, -180]}
                rotation={[0.2, 0.3, 0.2]}
                scale={0.6}
                size={0.65}
            />

            {/* NGC 205 風 伴銀河 */}
            <RealisticGalaxy
                count={25000}
                radius={180}
                isElliptical={true}
                insideColor="#fcfcfc"
                outsideColor="#e6f0ff"
                position={[450, -220, -350]}
                rotation={[-0.4, 0.5, -0.3]}
                scale={0.5}
                size={0.6}
            />
        </group>
    );
}
