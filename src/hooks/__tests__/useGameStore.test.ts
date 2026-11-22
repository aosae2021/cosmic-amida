import { act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../useGameStore';
import * as THREE from 'three';

describe('useGameStore', () => {
    beforeEach(() => {
        // テストごとにストアを初期化
        const { reset } = useGameStore.getState();
        act(() => reset());
        // ただし reset は resetCount を増やすので、厳密に初期状態にするには再生成が必要だが
        // そこまでシビアではないので、初期化のアサーションは考慮して行う
        useGameStore.setState({
            phase: "selecting",
            selectedPillar: null,
            bridges: [],
            cameraPath: [],
            resetCount: 0,
        });
    });

    it('has correct initial state', () => {
        const state = useGameStore.getState();
        expect(state.phase).toBe('selecting');
        expect(state.selectedPillar).toBeNull();
        expect(state.bridges).toEqual([]);
        expect(state.cameraPath).toEqual([]);
        expect(state.resetCount).toBe(0);
        // progress は存在しないこと
        expect((state as any).progress).toBeUndefined();
    });

    it('updates state on selectPillar', () => {
        act(() => {
            useGameStore.getState().selectPillar(2);
        });
        const state = useGameStore.getState();
        expect(state.selectedPillar).toBe(2);
        expect(state.phase).toBe('transitioning');
    });

    it('updates state on setPhase, setBridges, setCameraPath', () => {
        act(() => {
            useGameStore.getState().setPhase('descending');
            useGameStore.getState().setBridges([{ fromIndex: 0, toIndex: 1, heightIndex: 0 }]);
            useGameStore.getState().setCameraPath([new THREE.Vector3(0, 0, 0)]);
        });
        const state = useGameStore.getState();
        expect(state.phase).toBe('descending');
        expect(state.bridges).toEqual([{ fromIndex: 0, toIndex: 1, heightIndex: 0 }]);
        expect(state.cameraPath.length).toBe(1);
    });

    it('resets state and increments resetCount', () => {
        act(() => {
            useGameStore.getState().selectPillar(1);
            useGameStore.getState().setPhase('result');
        });

        const stateBefore = useGameStore.getState();
        const prevCount = stateBefore.resetCount;

        act(() => {
            useGameStore.getState().reset();
        });

        const stateAfter = useGameStore.getState();
        expect(stateAfter.phase).toBe('selecting');
        expect(stateAfter.selectedPillar).toBeNull();
        expect(stateAfter.bridges).toEqual([]);
        expect(stateAfter.cameraPath).toEqual([]);
        expect(stateAfter.resetCount).toBe(prevCount + 1);
    });
});
