"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";

// --- GLSL Shaders ---

const vertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
uniform float uTime;

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    // 表面をよりダイナミックに揺らす (Turbulent surface)
    float noise = sin(position.x * 0.2 + uTime) * cos(position.y * 0.2 + uTime * 0.5);
    vec3 newPosition = position + normal * noise * 2.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

const fragmentShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
uniform float uTime;
uniform sampler2D uTexture;

// 3D Simplex Noise approximation (Ashima Arts)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
}

float fbm(vec3 x) {
    float v = 0.0;
    float a = 0.5;
    vec3 shift = vec3(100.0);
    for (int i = 0; i < 5; ++i) {
        v += a * snoise(x);
        x = x * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

void main() {
    // テクスチャサンプリング (UVスクロールで動きを出す)
    vec2 scrollUv = vUv + vec2(uTime * 0.01, uTime * 0.005);
    vec4 texColor = texture2D(uTexture, scrollUv);
    
    // 3Dノイズによる対流
    vec3 noiseCoord = vPosition * 0.05 + uTime * 0.2;
    float n = fbm(noiseCoord);
    
    // テクスチャとノイズのブレンド
    vec3 colorBase = texColor.rgb * vec3(1.2, 0.4, 0.1); 
    vec3 colorHigh = vec3(1.0, 0.9, 0.5); 
    
    vec3 finalColor = mix(colorBase, colorHigh, smoothstep(0.1, 0.7, n));
    
    // フレネル効果によるエッジのグロー
    vec3 viewDirection = normalize(cameraPosition - vPosition);
    float fresnel = dot(viewDirection, vNormal);
    fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
    fresnel = pow(fresnel, 2.5);
    
    finalColor += vec3(1.0, 0.6, 0.2) * fresnel * 2.5;
    
    // 暗い部分（テクスチャの影）を強調して立体感を出す
    finalColor *= (0.8 + 0.4 * n);

    gl_FragColor = vec4(finalColor * 1.8, 1.0);
}
`;

/**
 * 太陽コロナの多層表現 (より柔らかく、重層的に)
 */
const SunCorona = ({ radius, scale, speed, color, opacity }: { radius: number, scale: number, speed: number, color: string, opacity: number }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (!meshRef.current) return;
        meshRef.current.rotation.y = state.clock.elapsedTime * speed * 0.2;
        meshRef.current.rotation.z = state.clock.elapsedTime * speed * 0.1;
        const s = scale + Math.sin(state.clock.elapsedTime * 2.0) * 0.02;
        meshRef.current.scale.set(s, s, s);
    });

    return (
        <mesh ref={meshRef}>
            <sphereGeometry args={[radius, 64, 64]} />
            <meshBasicMaterial
                color={color}
                transparent
                opacity={opacity}
                side={THREE.BackSide}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </mesh>
    );
};

/**
 * プロミネンス（紅炎）を表すパーティクル群
 */
const SunProminence = ({ radius }: { radius: number }) => {
    const pointsRef = useRef<THREE.Points>(null);
    const particleCount = 2500;

    const { positions, randoms } = useMemo(() => {
        const coords = new Float32Array(particleCount * 3);
        const rands = new Float32Array(particleCount);
        for (let i = 0; i < particleCount; i++) {
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI;
            const phi = Math.acos(2.0 * v - 1.0);
            const r = radius * (1.0 + Math.random() * 0.12);

            coords[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            coords[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            coords[i * 3 + 2] = r * Math.cos(phi);
            rands[i] = Math.random();
        }
        return { positions: coords, randoms: rands };
    }, [radius]);

    useFrame((state) => {
        if (!pointsRef.current) return;
        pointsRef.current.rotation.y = state.clock.elapsedTime * -0.03;
        // @ts-ignore
        pointsRef.current.material.uniforms.uTime.value = state.clock.elapsedTime;
    });

    const prominenceShader = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color("#ff8800") },
            uRadius: { value: radius }
        },
        vertexShader: `
            attribute float randoms;
            varying float vRandom;
            uniform float uTime;
            uniform float uRadius;
            void main() {
                vRandom = randoms;
                vec3 pos = position;
                pos += normal * sin(uTime * 2.0 + randoms * 10.0) * (uRadius * 0.08);
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = (25.0 * randoms) * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform vec3 uColor;
            varying float vRandom;
            void main() {
                vec2 coord = gl_PointCoord - vec2(0.5);
                float dist = length(coord);
                if(dist > 0.5) discard;
                float strength = 1.0 - (dist * 2.0);
                strength = pow(strength, 2.0);
                gl_FragColor = vec4(uColor * strength * 2.5, strength * 0.7);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    }), [radius]);

    return (
        <points ref={pointsRef} material={prominenceShader}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[positions, 3]}
                />
                <bufferAttribute
                    attach="attributes-randoms"
                    args={[randoms, 1]}
                />
            </bufferGeometry>
        </points>
    );
};

export default function RealisticSun({ radius = 75, position = [0, 0, 0] }: { radius?: number, position?: [number, number, number] }) {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const groupRef = useRef<THREE.Group>(null);

    // テクスチャのロード
    const surfaceTexture = useTexture("/textures/sun_surface.png");
    surfaceTexture.wrapS = surfaceTexture.wrapT = THREE.RepeatWrapping;

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        }
        if (groupRef.current) {
            groupRef.current.rotation.y = state.clock.elapsedTime * 0.015;
        }
    });

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uTexture: { value: surfaceTexture },
        }),
        [surfaceTexture]
    );

    return (
        <group position={new THREE.Vector3(...position)} ref={groupRef}>
            {/* 1. 太陽コア */}
            <mesh>
                <sphereGeometry args={[radius, 128, 128]} />
                <shaderMaterial
                    ref={materialRef}
                    vertexShader={vertexShader}
                    fragmentShader={fragmentShader}
                    uniforms={uniforms}
                />
            </mesh>

            {/* 2. 重層的なコロナ */}
            <SunCorona radius={radius} scale={1.03} speed={0.6} color="#ffaa00" opacity={0.4} />
            <SunCorona radius={radius} scale={1.15} speed={0.3} color="#ff7700" opacity={0.2} />
            <SunCorona radius={radius} scale={1.35} speed={0.15} color="#ff3300" opacity={0.08} />
            <SunCorona radius={radius} scale={1.6} speed={0.1} color="#550000" opacity={0.03} />

            {/* 3. プロミネンス（紅炎）エフェクト */}
            <SunProminence radius={radius} />

            {/* 4. 強烈な光源 */}
            <pointLight intensity={40000} distance={15000} color="#ffecd2" decay={1.2} />
        </group>
    );
}
