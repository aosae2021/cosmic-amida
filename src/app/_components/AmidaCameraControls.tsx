"use client";

/**
 * AmidaCameraControls.tsx
 *
 * あみだゲームのカメラ制御。フェーズに応じて以下を担当する。
 * - selecting: OrbitControls のみ（初期位置は useEffect で設定）
 * - transitioning: 選択柱上端へスムーズ移動、到着で countdown へ
 * - countdown: チャージ中の注視点・カメラ位置、チャージ完了で descending へは CountdownOverlay が担当
 * - descending: CatmullRomCurve3 に沿った一人称降下、FOV・バンキング・遠心力
 * - result: カメラを後方上方へ引き、俯瞰に戻す
 *
 * 注意: progress は useRef で管理し、Zustand には持たない（毎フレーム更新のため）。
 */

import React, { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { useGameStore } from "../../hooks/useGameStore";
import { AMIDA_CONFIG, type AmidaConfig } from "../../lib/amidaConfig";

const { layout } = AMIDA_CONFIG;

// ─── カメラ配置の定数 ───
/** カメラの後方オフセット倍率（進行方向の逆向き） */
const CAMERA_BEHIND = 5.25;
/** カメラの右方向オフセット倍率 */
const CAMERA_RIGHT = 2.25;
/** カメラの上方オフセット倍率 */
const CAMERA_ABOVE = 2.25;
/** 先読み量（lookAt ターゲットを進行方向の何%先に置くか） */
const LOOK_AHEAD_T = 0.02;

// ─── 物理シミュレーション定数 ───
/** 落下判定の tangent.y 閾値 */
const FALL_THRESHOLD = -0.5;
/** FOV のスピード感増幅係数 */
const FOV_SPEED_FACTOR = 8;

// ─── トランジション定数 ───
/** カメラ移動の lerp 係数 */
const TRANSITION_LERP = 0.05;
/** カメラ回転の slerp 係数 */
const TRANSITION_SLERP = 0.03;
/** カウントダウンへ遷移する距離のしきい値 */
const TRANSITION_ARRIVE_DIST = 0.3;
/** チャージ完了後のカメラ lerp 係数 */
const CHARGE_COMPLETE_LERP = 0.1;
/** チャージ完了後の FOV 縮小量 */
const CHARGE_ZOOM_FOV_OFFSET = 5;
/** リザルト時のカメラ戻り lerp 係数 */
const RESULT_CAMERA_LERP = 0.02;
/** リザルト完了判定距離 */
const RESULT_ARRIVE_DIST = 1.0;

interface AmidaCameraControlsProps {
    config: AmidaConfig;
    reducedMotion: boolean;
}

// ─── フェーズ別ハンドラーの引数型 ───
interface PhaseHandlerContext {
    camera: THREE.Camera;
    cameraPath: THREE.Vector3[];
    curveRef: React.MutableRefObject<THREE.CatmullRomCurve3 | null>;
    config: AmidaConfig;
    defaultFov: number;
    baseZ: number;
    delta: number;
    progressRef: React.MutableRefObject<number>;
    speedRef: React.MutableRefObject<number>;
    shakeTimeRef: React.MutableRefObject<number>;
    smoothedCentrifugalRef: React.MutableRefObject<THREE.Vector3>;
    resultCameraMoved: React.MutableRefObject<boolean>;
    lookAtTargetRef: React.MutableRefObject<THREE.Vector3>;
    setDescentProgress: (progress: number) => void;
}

/** transitioning: カメラを選択した柱の上端へスムーズ移動 */
function handleTransitioning(ctx: PhaseHandlerContext): void {
    const { camera, cameraPath, lookAtTargetRef } = ctx;
    const target = cameraPath[0];
    if (!target) return;

    camera.position.lerp(target, TRANSITION_LERP);

    const lookTarget = new THREE.Vector3(target.x, target.y - 3, target.z - 2);
    lookAtTargetRef.current.lerp(lookTarget, TRANSITION_LERP);
    camera.lookAt(lookAtTargetRef.current);

    if (camera.position.distanceTo(target) < TRANSITION_ARRIVE_DIST) {
        useGameStore.getState().setPhase("countdown");
    }
}

/** countdown: チャージ中のカメラ制御 */
function handleCountdown(ctx: PhaseHandlerContext): void {
    const { camera, cameraPath, curveRef, config: cfg, defaultFov, lookAtTargetRef } = ctx;
    const { isChargeComplete } = useGameStore.getState();
    const startPoint = cameraPath[1];
    if (!startPoint) return;

    // あみだの玉が画面中央（センター）に来るように、注視点をスタート地点そのものに設定
    const lookTarget = new THREE.Vector3(startPoint.x, startPoint.y, startPoint.z);

    if (isChargeComplete && curveRef.current) {
        const m = cfg.camera.descendDistanceMultiplier;
        const tangent = curveRef.current.getTangentAt(0).normalize();
        const cameraRight = new THREE.Vector3(1, 0, 0)
            .applyQuaternion(camera.quaternion)
            .normalize();

        const targetPos = new THREE.Vector3()
            .copy(startPoint)
            .add(tangent.clone().multiplyScalar(-(CAMERA_BEHIND * m)))
            .add(cameraRight.clone().multiplyScalar(CAMERA_RIGHT * m));
        targetPos.y += CAMERA_ABOVE * m;

        camera.position.lerp(targetPos, CHARGE_COMPLETE_LERP);
        lookAtTargetRef.current.lerp(lookTarget, CHARGE_COMPLETE_LERP);
        camera.lookAt(lookAtTargetRef.current);

        // ... (省略) FOV処理
        if (camera instanceof THREE.PerspectiveCamera) {
            camera.fov = THREE.MathUtils.lerp(
                camera.fov,
                defaultFov - CHARGE_ZOOM_FOV_OFFSET,
                CHARGE_COMPLETE_LERP
            );
            camera.updateProjectionMatrix();
        }
    } else {
        // 全体的に表示されるものが画面の1/4ほど下側に移動するようにしつつ、玉がUI（25vh位置）と完全に重ならないよう微調整
        lookAtTargetRef.current.lerp(lookTarget, CHARGE_COMPLETE_LERP);
        camera.lookAt(lookAtTargetRef.current);
    }
}

/** descending: 物理ベースの速度・カメラシェイク制御で経路を追従 */
function handleDescending(ctx: PhaseHandlerContext): void {
    const {
        camera, curveRef, config: cfg, defaultFov, delta: rawDelta,
        progressRef, speedRef, shakeTimeRef, smoothedCentrifugalRef,
        lookAtTargetRef, setDescentProgress,
    } = ctx;

    // ワープ防止用のデルタ値クランプ（最大50ms）
    const delta = Math.min(rawDelta, 0.05);

    if (!curveRef.current) return;

    const currentTangent = curveRef.current.getTangentAt(progressRef.current).normalize();
    const isFalling = currentTangent.y < FALL_THRESHOLD;

    // 等速: 常に descentSpeed で進行（加速・減速なし）
    speedRef.current = cfg.camera.descentSpeed;

    progressRef.current += delta * speedRef.current;
    if (progressRef.current >= 1) progressRef.current = 1;

    const t = Math.min(progressRef.current, 1.0);
    setDescentProgress(t);
    const currentPos = curveRef.current.getPointAt(t);
    const tangent = curveRef.current.getTangentAt(t).normalize();

    // カメラの右ベクトル
    const cameraRight = new THREE.Vector3(1, 0, 0)
        .applyQuaternion(camera.quaternion)
        .normalize();

    // 遠心力の計算
    const tFront = Math.min(1.0, t + LOOK_AHEAD_T);
    const tBack = Math.max(0.0, t - LOOK_AHEAD_T);
    const tangentFront = curveRef.current.getTangentAt(tFront).normalize();
    const tangentBack = curveRef.current.getTangentAt(tBack).normalize();

    const turnDelta = new THREE.Vector3().subVectors(tangentFront, tangentBack);
    turnDelta.y = 0;

    const rawCentrifugal = turnDelta.multiplyScalar(-cfg.camera.centrifugalForceMultiplier);
    smoothedCentrifugalRef.current.lerp(rawCentrifugal, 0.05);

    const m = cfg.camera.descendDistanceMultiplier;

    // あみだの円柱構造の外側へ向かうベクトル（中心付近では既定ベクトルで安定化）
    const outwardRaw = new THREE.Vector3(currentPos.x, 0, currentPos.z);
    const outwardDir = outwardRaw.lengthSq() < 0.01
        ? new THREE.Vector3(1, 0, 0)
        : outwardRaw.clone().normalize();

    // 落下中（縦移動）の場合、特異点を防ぐため、tangentをそのまま使わず
    // 外側斜め上からの視点になるようにbaseDirを補正する
    const baseDir = new THREE.Vector3().copy(tangent);
    if (baseDir.y < -0.5) {
        const fallFactor = Math.abs(baseDir.y);
        baseDir.lerp(outwardDir, (fallFactor - 0.5) * 0.8).normalize();
    }

    // カメラオフセット (後方 + 右 + 遠心力)
    // 落下中（縦移動）は右オフセットと遠心力をゼロにして画面のぐるぐる回転を防ぐ
    const currentCameraRight = isFalling ? new THREE.Vector3(0, 0, 0) : cameraRight;
    const centrifugalOffset = isFalling ? new THREE.Vector3(0, 0, 0) : smoothedCentrifugalRef.current;
    const cameraOffset = new THREE.Vector3()
        .copy(baseDir)
        .multiplyScalar(-(CAMERA_BEHIND * m))
        .add(currentCameraRight.clone().multiplyScalar(CAMERA_RIGHT * m))
        .add(centrifugalOffset);

    camera.position.copy(currentPos).add(cameraOffset);
    camera.position.y += CAMERA_ABOVE * m;

    // ルートの少し先を注視（縦移動時は注視を強く補間して回転を抑える）
    const lookAheadT = Math.min(1.0, t + LOOK_AHEAD_T);
    const targetPos = curveRef.current.getPointAt(lookAheadT);
    const lookLerp = isFalling ? 0.25 : 0.1;

    // バンキング (縦移動中はロールさせない)
    const tiltAngle = isFalling ? 0 :
        (smoothedCentrifugalRef.current.x * cfg.camera.bankingMultiplier +
            smoothedCentrifugalRef.current.z * cfg.camera.bankingMultiplier);
    const targetZRotation = THREE.MathUtils.clamp(tiltAngle, -Math.PI / 6, Math.PI / 6);
    camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, targetZRotation, 0.1);

    // FOV 演出
    const speedRatio = speedRef.current / cfg.camera.descentSpeed;
    const targetFov = defaultFov + (speedRatio - 1) * FOV_SPEED_FACTOR;
    if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.1);
        camera.updateProjectionMatrix();
    }

    lookAtTargetRef.current.lerp(targetPos, lookLerp);
    camera.lookAt(lookAtTargetRef.current);

    // ゴール判定
    if (progressRef.current >= cfg.camera.flashTriggerProgress) {
        useGameStore.getState().setPhase("result");
    }
}

/** result: カメラをスムーズに後方上方へ引く */
function handleResult(ctx: PhaseHandlerContext): void {
    const { camera, baseZ, defaultFov, resultCameraMoved, lookAtTargetRef } = ctx;

    if (resultCameraMoved.current) return;

    const targetPos = new THREE.Vector3(0, 15 + layout.pillarHeight, baseZ + 5);
    camera.position.lerp(targetPos, RESULT_CAMERA_LERP);

    lookAtTargetRef.current.lerp(new THREE.Vector3(0, layout.pillarHeight / 2, 0), RESULT_CAMERA_LERP);
    camera.lookAt(lookAtTargetRef.current);

    camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, 0, 0.05);
    if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, defaultFov, 0.05);
        camera.updateProjectionMatrix();
    }

    if (camera.position.distanceTo(targetPos) < RESULT_ARRIVE_DIST) {
        resultCameraMoved.current = true;
        camera.rotation.z = 0;
        if (camera instanceof THREE.PerspectiveCamera) {
            camera.fov = defaultFov;
            camera.updateProjectionMatrix();
        }
    }
}

export default function AmidaCameraControls({ config, reducedMotion }: AmidaCameraControlsProps) {
    const { camera, size } = useThree();
    const isPortrait = size.width < size.height;
    const baseZ = isPortrait ? 60 : 40;
    const defaultFov = isPortrait ? 75 : 60;
    const phase = useGameStore((s) => s.phase);
    const cameraPath = useGameStore((s) => s.cameraPath);
    const setDescentProgress = useGameStore((s) => s.setDescentProgress);

    // カメラ経路追従用 refs
    const progressRef = useRef(0);
    const speedRef = useRef(config.camera.descentSpeed * 0.1);
    const shakeTimeRef = useRef(0);
    const curveRef = useRef<THREE.CatmullRomCurve3 | null>(null);
    const smoothedCentrifugalRef = useRef(new THREE.Vector3(0, 0, 0));
    const resultCameraMoved = useRef(false);
    const lookAtTargetRef = useRef(new THREE.Vector3(0, layout.pillarHeight, 0));

    // cameraPath が確定したらスプライン生成
    useEffect(() => {
        if (cameraPath.length >= 4) {
            const curve = new THREE.CatmullRomCurve3(
                cameraPath.slice(1, -1),
                false,
                "catmullrom",
                config.camera.splineTension
            );
            curveRef.current = curve;
            progressRef.current = 0;
            speedRef.current = config.camera.descentSpeed * 0.1;
            shakeTimeRef.current = 0;
            smoothedCentrifugalRef.current.set(0, 0, 0);
        }
    }, [cameraPath, config.camera]);

    // リセット時にリザルトカメラのフラグを下ろす
    useEffect(() => {
        if (phase === "selecting") {
            resultCameraMoved.current = false;
        }
    }, [phase]);

    // 初期カメラ位置
    useEffect(() => {
        if (phase === "selecting") {
            const initialLookAt = new THREE.Vector3(0, layout.pillarHeight, 0);
            camera.position.set(0, 10 + layout.pillarHeight, baseZ);
            lookAtTargetRef.current.copy(initialLookAt);
            camera.lookAt(initialLookAt);
            camera.rotation.z = 0;
            if (camera instanceof THREE.PerspectiveCamera) {
                camera.fov = defaultFov;
                camera.updateProjectionMatrix();
            }
        }
    }, [phase, camera, baseZ, defaultFov, layout.pillarHeight]);

    useFrame((_, delta) => {
        const { phase: currentPhase } = useGameStore.getState();

        const ctx: PhaseHandlerContext = {
            camera, cameraPath, curveRef, config, defaultFov, baseZ, delta,
            progressRef, speedRef, shakeTimeRef, smoothedCentrifugalRef,
            resultCameraMoved, lookAtTargetRef, setDescentProgress,
        };

        switch (currentPhase) {
            case "transitioning":
                handleTransitioning(ctx);
                break;
            case "countdown":
                handleCountdown(ctx);
                break;
            case "descending":
                if (!reducedMotion) handleDescending(ctx);
                break;
            case "result":
                handleResult(ctx);
                break;
        }
    });

    return (
        <>
            <PerspectiveCamera makeDefault position={[0, 10 + layout.pillarHeight, baseZ]} fov={defaultFov} far={10000}>
                {/* シェーダー再コンパイルのラグを防ぐため常時マウントし、intensityで制御 */}
                <pointLight intensity={phase === "descending" ? 3 : 0} distance={50} color="#e0f0ff" decay={2} />
            </PerspectiveCamera>

            <OrbitControls
                enableDamping
                enabled={phase === "selecting" || phase === "result"}
                makeDefault
                target={[0, layout.pillarHeight, 0]}
                minDistance={10}
                maxDistance={120}
            />
        </>
    );
}
