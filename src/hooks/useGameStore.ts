/**
 * useGameStore.ts
 * Zustand グローバルストア。
 *
 * 設計注意1: `progress` は毎フレーム更新されるため Zustand に持たない。
 *            useFrame 内で useRef を使ってローカル管理すること。
 * 設計注意2: useFrame 内で Zustand の値を読む場合は
 *            useGameStore.getState() を使用（フックとして呼ばない）。
 */

import { create } from "zustand";
import type * as THREE from "three";

export type GamePhase =
    | "selecting"
    | "transitioning"
    | "countdown"
    | "descending"
    | "result";

export interface Bridge {
    /** 接続元の柱インデックス */
    fromIndex: number;
    /** 接続先の柱インデックス */
    toIndex: number;
    /** あみだの縦軸における高さ段数（0 = 最上段） */
    heightIndex: number;
}

interface GameState {
    phase: GamePhase;
    selectedPillar: number | null;
    bridges: Bridge[];
    cameraPath: THREE.Vector3[];
    /** 到達した結果（大吉、中吉など） */
    finalResult: string | null;
    /** リプレイ回数。Canvas key={resetCount} で Canvas を再マウントするために使用 */
    resetCount: number;
    /** 降下フェーズの進捗 (0.0 ~ 1.0) */
    descentProgress: number;
    /** チャージが完了して 0.5s 待機中かどうか */
    isChargeComplete: boolean;
    /** チャージの進行度 (0.0 ~ 100.0) */
    chargeProgress: number;
    /** ポーズ中かどうか */
    isPaused: boolean;
    // ─── Actions ───
    selectPillar: (index: number) => void;
    setPhase: (phase: GamePhase) => void;
    setBridges: (bridges: Bridge[]) => void;
    setCameraPath: (path: THREE.Vector3[]) => void;
    setFinalResult: (result: string) => void;
    setDescentProgress: (progress: number) => void;
    setChargeProgress: (progress: number) => void;
    setChargeComplete: (complete: boolean) => void;
    togglePause: () => void;
    /** リセット: resetCount++ + フェーズを 'selecting' に戻す */
    reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
    phase: "selecting",
    selectedPillar: null,
    bridges: [],
    cameraPath: [],
    finalResult: null,
    resetCount: 0,
    descentProgress: 0,
    chargeProgress: 0,
    isChargeComplete: false,
    isPaused: false,
    selectPillar: (index) =>
        set({ selectedPillar: index, phase: "transitioning" }),

    setPhase: (phase) => set({ phase }),

    setBridges: (bridges) => set({ bridges }),

    setCameraPath: (path) => set({ cameraPath: path }),

    setFinalResult: (result) => set({ finalResult: result }),
    setDescentProgress: (descentProgress) => set({ descentProgress }),
    setChargeProgress: (chargeProgress) => set({ chargeProgress }),
    setChargeComplete: (isChargeComplete) => set({ isChargeComplete }),
    togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

    reset: () =>
        set((state) => ({
            phase: "selecting",
            selectedPillar: null,
            bridges: [],
            cameraPath: [],
            finalResult: null,
            descentProgress: 0,
            chargeProgress: 0,
            isChargeComplete: false,
            isPaused: false,
            resetCount: state.resetCount + 1,
        })),
}));
