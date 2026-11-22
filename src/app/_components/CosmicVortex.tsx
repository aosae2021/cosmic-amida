"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useGameStore } from "../../hooks/useGameStore";

export default function CosmicVortex() {
    const phase = useGameStore((s) => s.phase);
    const pointsRef = useRef<THREE.Points>(null);

    const count = 1000;
    const [positions, initialPositions, velocities] = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const initPos = new Float32Array(count * 3);
        const vels = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const r = 20 + Math.random() * 30;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            initPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            initPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) + 15; // 中央付近
            initPos[i * 3 + 2] = r * Math.cos(phi);

            pos[i * 3] = initPos[i * 3];
            pos[i * 3 + 1] = initPos[i * 3 + 1];
            pos[i * 3 + 2] = initPos[i * 3 + 2];

            vels[i * 3] = (Math.random() - 0.5) * 0.1;
            vels[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
            vels[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
        }
        return [pos, initPos, vels];
    }, []);

    useFrame(() => {
        if (!pointsRef.current) return;
        const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;

        for (let i = 0; i < count; i++) {
            const ix = i * 3;
            const iy = i * 3 + 1;
            const iz = i * 3 + 2;

            if (phase === "countdown") {
                // 中央に向かって加速
                const targetY = 30; // ゲージの高さ想定
                positions[ix] *= 0.95;
                positions[iy] = positions[iy] * 0.95 + targetY * 0.05;
                positions[iz] *= 0.95;

                // ある程度近づいたらリセット
                if (Math.abs(positions[ix]) < 0.5 && Math.abs(positions[iz]) < 0.5) {
                    positions[ix] = initialPositions[ix];
                    positions[iy] = initialPositions[iy];
                    positions[iz] = initialPositions[iz];
                }
            } else {
                // 通常時はゆっくり漂う
                positions[ix] += velocities[ix];
                positions[iy] += velocities[iy];
                positions[iz] += velocities[iz];
            }
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
    });

    if (phase !== "countdown") return null;

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[positions, 3]}
                    count={count}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.15}
                color="#7eb8f7"
                transparent
                opacity={0.6}
                blending={THREE.AdditiveBlending}
                sizeAttenuation
            />
        </points>
    );
}
