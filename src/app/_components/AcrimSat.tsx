"use client";

import { useGLTF } from "@react-three/drei";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface AcrimSatProps {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number | [number, number, number];
}

export default function AcrimSat({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: AcrimSatProps) {
    // NASAのACRIMSATモデルをロード
    const { scene } = useGLTF("/models/acrimsat.glb");
    const groupRef = useRef<THREE.Group>(null);

    // 衛星がゆっくり自転するアニメーション
    useFrame((_, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += delta * 0.1;
            groupRef.current.rotation.x += delta * 0.05;
        }
    });

    return (
        <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
            <primitive object={scene} />
        </group>
    );
}

// プリロードしておき、表示を高速化する
useGLTF.preload("/models/acrimsat.glb");
