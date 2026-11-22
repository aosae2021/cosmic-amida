"use client";

/**
 * DirectionalSparks.tsx
 * 進行方向の逆向きに火花パーティクルを噴射するエフェクトコンポーネント。
 * InstancedMesh を使用して大量の棒状パーティクルを高速描画する。
 */

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

// ─── 火花パーティクルの定数 ───
const PARTICLE_COUNT = 800;
const BURST_COUNT = 20;
const EMIT_INTERVAL = 0.002;
/** 経路長あたりの火花量を一定にするための基準速度（これで BURST_COUNT 発射） */
const REFERENCE_SPEED = 0.08;
/** 横移動（3D移動量が小さい）でも火花が減りすぎないよう最低発射数 */
const MIN_BURST = 18;
const SPREAD = 10.0;
const GRAVITY = 10.0;
const AIR_RESISTANCE = 0.92;
const MIN_LIFETIME = 0.15;
const LIFETIME_RANGE = 0.35;
const MIN_SPEED = 6.0;
const SPEED_RANGE = 10.0;
const UPWARD_BIAS = 4.0;
const HDR_MULTIPLIER = 5.0;

export interface DirectionalSparksProps {
    /** 火花が発生する先端の位置 (再レンダリング防止のためRefで渡す) */
    tipPosRef: React.MutableRefObject<THREE.Vector3 | null>;
    /** 経路の接線（横移動でフレーム間移動が小さいときの火花の向き用） */
    tangentRef?: React.MutableRefObject<THREE.Vector3>;
}

export default function DirectionalSparks({ tipPosRef, tangentRef }: DirectionalSparksProps) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const particlesData = useRef<{
        velocities: THREE.Vector3[];
        lifetimes: number[];
        maxLifetimes: number[];
        positions: THREE.Vector3[];
    }>({
        velocities: Array.from({ length: PARTICLE_COUNT }, () => new THREE.Vector3()),
        lifetimes: new Array(PARTICLE_COUNT).fill(0),
        maxLifetimes: new Array(PARTICLE_COUNT).fill(0),
        positions: Array.from({ length: PARTICLE_COUNT }, () => new THREE.Vector3()),
    });
    const nextEmit = useRef(0);
    const dummy = useRef(new THREE.Object3D());
    const color = useRef(new THREE.Color());
    const prevTipPosition = useRef(new THREE.Vector3());
    const isFirstFrame = useRef(true);

    useFrame((_, delta) => {
        if (!meshRef.current || !tipPosRef.current) return;
        const tipPosition = tipPosRef.current;

        if (isFirstFrame.current) {
            prevTipPosition.current.copy(tipPosition);
            isFirstFrame.current = false;
        }

        const data = particlesData.current;

        // 進行方向（現在位置 - 前フレームの位置）
        const moveDir = new THREE.Vector3().subVectors(tipPosition, prevTipPosition.current);
        const speed = moveDir.length();
        // 横移動はフレームあたりの移動量が小さいため、接線方向をフォールバックに使う
        const useTangent = tangentRef && speed < 1e-4;
        const reverseDir = useTangent && tangentRef.current
            ? tangentRef.current.clone().multiplyScalar(-1)
            : speed > 1e-9
                ? moveDir.clone().normalize().multiplyScalar(-1)
                : new THREE.Vector3(0, 1, 0);

        // パーティクル発射（縦・横とも発射。横は接線方向で方向を決める）
        nextEmit.current -= delta;
        const shouldEmit = nextEmit.current <= 0 && (speed > 1e-9 || (tangentRef?.current && tangentRef.current.lengthSq() > 0.01));
        if (shouldEmit) {
            const burstCount = speed >= 1e-4
                ? Math.max(MIN_BURST, Math.min(BURST_COUNT, Math.floor(BURST_COUNT * (speed / REFERENCE_SPEED))))
                : MIN_BURST;
            for (let burst = 0; burst < burstCount; burst++) {
                let slot = -1;
                for (let i = 0; i < PARTICLE_COUNT; i++) {
                    if (data.lifetimes[i] <= 0) { slot = i; break; }
                }
                if (slot === -1) break;

                data.positions[slot].copy(tipPosition);
                data.velocities[slot].set(
                    reverseDir.x * (MIN_SPEED + Math.random() * SPEED_RANGE) + (Math.random() - 0.5) * SPREAD,
                    reverseDir.y * (MIN_SPEED + Math.random() * SPEED_RANGE) + (Math.random() - 0.5) * SPREAD + UPWARD_BIAS,
                    reverseDir.z * (MIN_SPEED + Math.random() * SPEED_RANGE) + (Math.random() - 0.5) * SPREAD,
                );
                data.maxLifetimes[slot] = MIN_LIFETIME + Math.random() * LIFETIME_RANGE;
                data.lifetimes[slot] = data.maxLifetimes[slot];
            }
            // 横移動（速度が小さい）時は発射間隔を短くして火花の密度を維持
            nextEmit.current = (speed < 1e-4 || speed < REFERENCE_SPEED * 0.5) ? EMIT_INTERVAL * 0.5 : EMIT_INTERVAL;
        }

        // パーティクル更新
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            if (data.lifetimes[i] <= 0) {
                dummy.current.position.set(0, -9999, 0);
                dummy.current.scale.setScalar(0);
                dummy.current.updateMatrix();
                meshRef.current.setMatrixAt(i, dummy.current.matrix);
                continue;
            }

            data.lifetimes[i] -= delta;
            const lifeRatio = Math.max(0, data.lifetimes[i] / data.maxLifetimes[i]);

            // 位置更新（速度 + 重力 + 空気抵抗）
            data.positions[i].addScaledVector(data.velocities[i], delta);
            data.velocities[i].y -= GRAVITY * delta;
            data.velocities[i].multiplyScalar(AIR_RESISTANCE);

            dummy.current.position.copy(data.positions[i]);

            // 速度ベクトルの方向に棒を向ける
            const vel = data.velocities[i];
            if (vel.lengthSq() > 0.0001) {
                const target = data.positions[i].clone().add(vel);
                dummy.current.lookAt(target);
            }

            // 棒状スケール: 細くて長い（火花らしい形状）
            const thickness = lifeRatio * (0.03 + Math.random() * 0.02);
            const length = lifeRatio * (0.15 + vel.length() * 0.08);
            dummy.current.scale.set(thickness, thickness, length);
            dummy.current.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.current.matrix);

            // 色: 黄色→オレンジ→赤 + HDR発光
            const h = lifeRatio * 0.1 + 0.01;
            const s = 1.0;
            const l = 0.5 + lifeRatio * 0.5;
            color.current.setHSL(h, s, l);
            color.current.multiplyScalar(lifeRatio * HDR_MULTIPLIER + 1.0);
            meshRef.current.setColorAt(i, color.current);
        }

        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) {
            meshRef.current.instanceColor.needsUpdate = true;
        }

        // 前フレームの位置を保存
        prevTipPosition.current.copy(tipPosition);
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
            <cylinderGeometry args={[1, 0.3, 1, 4, 1]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
        </instancedMesh>
    );
}
