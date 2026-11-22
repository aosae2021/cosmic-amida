/**
 * useAmidaLogic.ts
 * あみだくじの経路計算ロジック。
 *
 * アルゴリズム: ボトムアップ逆算方式
 * 1. goalIndex からスタートし、各高さ（下→上）を逆走して横線を配置
 * 2. 横線配列を反転して上→下の順序に変換
 * 3. bridgeCount 自動補完: 最小必要本数 |startIndex - goalIndex| を保証
 *
 * Phase 7: 柱座標を平面 X → 円弧 (x, z) に変換
 */

import { useMemo } from "react";
import * as THREE from "three";
import type { Bridge } from "./useGameStore";
import { AMIDA_CONFIG } from "../lib/amidaConfig";

const { layout } = AMIDA_CONFIG;

export interface PillarPosition {
    x: number;
    z: number;
}

export interface AmidaResult {
    bridges: Bridge[];
    cameraPath: THREE.Vector3[];
    goalIndex: number;
}

/**
 * 柱インデックスから円周上の (x, z) 座標を返す。
 *
 * @param idx 柱のインデックス (0〜pillarCount-1)
 * @returns 円周上の {x, z} 座標
 */
export function pillarPositionOf(idx: number): PillarPosition {
    const { cylinderRadius, pillarCount } = layout;
    // 正五角形（またはn角形）の頂点に配置するため 2PI を等分
    const angle = (idx / pillarCount) * Math.PI * 2;
    return {
        x: cylinderRadius * Math.sin(angle),
        z: cylinderRadius * Math.cos(angle),
    };
}

/**
 * あみだくじの経路と横線を計算する。
 *
 * @param startIndex 選択した柱のインデックス (0〜pillarCount-1)
 * @returns 横線配列とカメラ経路
 */
export function useAmidaLogic(startIndex: number | null): AmidaResult {
    return useMemo(() => {
        if (startIndex === null) {
            return { bridges: [], cameraPath: [], goalIndex: 0 };
        }

        const { pillarCount, pillarHeight, bridgeCount } = layout;
        const levels = bridgeCount + 2;

        // ─── 完全ランダムあみだ生成（対角線あり） ──────────────────────────
        const bridges: Bridge[] = [];
        for (let level = 0; level < bridgeCount; level++) {
            // ランダムに2つの異なる柱を選ぶ
            const fromIndex = Math.floor(Math.random() * pillarCount);
            let toIndex = Math.floor(Math.random() * (pillarCount - 1));
            if (toIndex >= fromIndex) toIndex++;

            bridges.push({ fromIndex, toIndex, heightIndex: level });
        }
        // ───────────────────────────────────────────────────────────────

        // ─── カメラ経路生成（円周座標・対角線対応） ───────────────────────
        const halfHeight = pillarHeight / 2;
        const yOffset = pillarHeight; // あみだ１つぶん上に移動
        const startPos = pillarPositionOf(startIndex);
        const pathPoints: THREE.Vector3[] = [];

        // 俯瞰開始位置（棒の真上からちょっと横にずらした視点）
        pathPoints.push(new THREE.Vector3(startPos.x * 1.05 + 1.0, halfHeight + 2 + yOffset, startPos.z * 1.05 + 1.5));
        pathPoints.push(new THREE.Vector3(startPos.x, halfHeight + yOffset, startPos.z));

        let currentIdx = startIndex;
        const levelHeight = pillarHeight / (levels + 1);

        for (const bridge of bridges) {
            const y = halfHeight - (bridge.heightIndex + 1) * levelHeight + yOffset;
            const fromPos = pillarPositionOf(bridge.fromIndex);
            const toPos = pillarPositionOf(bridge.toIndex);

            // 自分がこのブリッジに関係しているかチェック
            if (currentIdx === bridge.fromIndex || currentIdx === bridge.toIndex) {
                const targetIdx = currentIdx === bridge.fromIndex ? bridge.toIndex : bridge.fromIndex;
                const targetPos = pillarPositionOf(targetIdx);
                const currentPos = pillarPositionOf(currentIdx);

                // 橋を渡る前の予備動作
                pathPoints.push(new THREE.Vector3(currentPos.x, y + levelHeight * 0.2, currentPos.z));

                // 橋の中間地点（対角線でも直進感が出るように）
                const midX = (currentPos.x + targetPos.x) / 2;
                const midZ = (currentPos.z + targetPos.z) / 2;
                pathPoints.push(new THREE.Vector3(midX, y + levelHeight * 0.1, midZ));

                // 橋を渡った後の位置
                pathPoints.push(new THREE.Vector3(targetPos.x, y, targetPos.z));
                currentIdx = targetIdx;
            } else {
                // 素通りする場合の通過点
                const currentPos = pillarPositionOf(currentIdx);
                pathPoints.push(new THREE.Vector3(currentPos.x, y, currentPos.z));
            }
        }

        // ゴールへ降下
        const finalPos = pillarPositionOf(currentIdx);
        pathPoints.push(new THREE.Vector3(finalPos.x, -halfHeight - 1 + yOffset, finalPos.z));
        pathPoints.push(new THREE.Vector3(finalPos.x * 1.2, -halfHeight - 2 + yOffset, finalPos.z * 1.2 + 2));

        return { bridges, cameraPath: pathPoints, goalIndex: currentIdx };
    }, [startIndex]);
}
