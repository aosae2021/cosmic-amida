import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useAmidaLogic } from '../useAmidaLogic';
import { AMIDA_CONFIG } from '../../lib/amidaConfig';

describe('useAmidaLogic', () => {
    const { pillarCount } = AMIDA_CONFIG.layout;

    it('returns empty result when startIndex is null', () => {
        const { result } = renderHook(() => useAmidaLogic(null));
        expect(result.current.bridges).toEqual([]);
        expect(result.current.cameraPath).toEqual([]);
    });

    it('reaches the goal from every start index', () => {
        for (let startIndex = 0; startIndex < pillarCount; startIndex++) {
            const { result } = renderHook(() => useAmidaLogic(startIndex));
            const bridges = result.current.bridges;

            // 辿るシミュレーション
            let currentPos = startIndex;
            for (let level = 0; level < bridges.length; level++) {
                const bridge = bridges.find(b => b.heightIndex === level);
                if (bridge) {
                    if (currentPos === bridge.fromIndex) {
                        currentPos = bridge.toIndex;
                    } else if (currentPos === bridge.toIndex) {
                        currentPos = bridge.fromIndex;
                    }
                }
            }

            expect(currentPos).toBe(result.current.goalIndex);
        }
    });

    it('generates consistent connections for 10 random seeds per start index', () => {
        for (let startIndex = 0; startIndex < pillarCount; startIndex++) {
            for (let i = 0; i < 10; i++) {
                const { result } = renderHook(() => useAmidaLogic(startIndex));
                const bridges = result.current.bridges;

                let currentPos = startIndex;
                for (let level = 0; level < bridges.length; level++) {
                    const bridge = bridges.find(b => b.heightIndex === level);
                    if (bridge) {
                        if (currentPos === bridge.fromIndex) {
                            currentPos = bridge.toIndex;
                        } else if (currentPos === bridge.toIndex) {
                            currentPos = bridge.fromIndex;
                        }
                    }
                }

                expect(currentPos).toBe(result.current.goalIndex);
            }
        }
    });

    it('automatically complements bridgeCount if needed', () => {
        const startIndex = 0;
        const { result } = renderHook(() => useAmidaLogic(startIndex));
        const bridges = result.current.bridges;

        let currentPos = startIndex;
        for (let level = 0; level < bridges.length; level++) {
            const bridge = bridges.find(b => b.heightIndex === level);
            if (bridge) {
                if (currentPos === bridge.fromIndex) {
                    currentPos = bridge.toIndex;
                } else if (currentPos === bridge.toIndex) {
                    currentPos = bridge.fromIndex;
                }
            }
        }
        expect(currentPos).toBe(result.current.goalIndex);
    });
});
