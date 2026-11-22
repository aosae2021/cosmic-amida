"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Volumetric Starfield Background based on "Star Nest" by Kali
 * Re-implemented as a Three.js custom shader material.
 * This draws on a large BackSide sphere surrounding the scene.
 */

const starfieldVertexShader = `
varying vec2 vUv;
varying vec3 vPosition;

void main() {
    vUv = uv;
    vPosition = position;
    // 背景用なので、常にカメラを中心に配置させるか、巨大な球にする
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const starfieldFragmentShader = `
uniform float uTime;
uniform vec2 uResolution;

varying vec2 vUv;
varying vec3 vPosition;

// Star Nest constants
#define iterations 17
#define formuparam 0.53

#define volsteps 20
#define stepsize 0.1

#define zoom   0.800
#define tile   0.850
#define speed  0.005 

#define brightness 0.0004
#define darkmatter 0.300
#define distfading 0.730
#define saturation 0.850

void main() {
    // スクリーン座標系の正規化 (0~1 => -0.5~0.5)
    vec2 uv = vUv - 0.5;
    
    // レイの進行方向を計算 (球体のローカルポジションからベクトルを得る)
    vec3 dir = normalize(vPosition);
    // uvを少し加えてパースペクティブ感を入れるか、dirをそのまま使う
    // 今回は全天球にマッピングするため dir をベースにする
    
    float time = uTime * speed + 0.25;

    // From (カメラ位置のようなものだが、宇宙空間を漂うオフセットとして利用)
    // 時間によって僅かに移動させる
    vec3 from = vec3(1.0, 0.5, 0.5);
    from += vec3(time * 1.5, time, -time * 0.5);
    
    // レイマーチングによるボリュームレンダリング
    float s = 0.1;
    float fade = 1.0;
    vec3 v = vec3(0.0);
    
    for (int r = 0; r < volsteps; r++) {
        vec3 p = from + s * dir * 0.5;
        p = abs(vec3(tile) - mod(p, vec3(tile * 2.0))); // tiling fold
        
        float pa = 0.0;
        float a = 0.0;
        for (int i = 0; i < iterations; i++) { 
            p = abs(p) / dot(p,p) - formuparam; // the magic formula
            a += abs(length(p) - pa); // absolute sum of average change
            pa = length(p);
        }
        
        float dm = max(0.0, darkmatter - a * a * 0.001); // dark matter
        a *= a * a; // add contrast
        if (r > 6) fade *= 1.0 - dm; // dark matter, don't render near
        
        v += fade;
        v += vec3(s, s * s, s * s * s * s) * a * brightness * fade; // coloring based on distance
        
        fade *= distfading; // distance fading
        s += stepsize;
    }
    
    v = mix(vec3(length(v)), v, saturation); // color adjust
    
    // 最終カラー (漆黒に近い背景へ)
    gl_FragColor = vec4(v * 0.003, 1.0);
}
`;

export default function StarfieldBackground() {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { size } = useThree();

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        }
    });

    return (
        <mesh>
            {/* 巨大な球体でシーンを囲む */}
            <sphereGeometry args={[8000, 64, 64]} />
            <shaderMaterial
                ref={materialRef}
                side={THREE.BackSide} // 内側から見る
                vertexShader={starfieldVertexShader}
                fragmentShader={starfieldFragmentShader}
                uniforms={{
                    uTime: { value: 0 },
                    uResolution: { value: new THREE.Vector2(size.width, size.height) }
                }}
                depthWrite={false} // 背景なので深度には書き込まない
            />
        </mesh>
    );
}
