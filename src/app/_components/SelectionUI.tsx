"use client";

/**
 * SelectionUI.tsx
 * 柱選択 UI。drei の <Html> で3D空間にボタンを追従させる。
 * z-indexRange は CSS変数 --z-3d-html: 100 に準拠。
 *
 * Phase 7: ボタン座標を円弧配置に合わせて (x, y, z) に更新。
 */

import { Html } from "@react-three/drei";
import { useGameStore } from "../../hooks/useGameStore";
import { pillarPositionOf } from "../../hooks/useAmidaLogic";
import { AMIDA_CONFIG } from "../../lib/amidaConfig";
import { soundManager } from "../../lib/sound";

const { layout } = AMIDA_CONFIG;

export default function SelectionUI() {
    const phase = useGameStore((s) => s.phase);
    const selectPillar = useGameStore((s) => s.selectPillar);
    const customParticipants = useGameStore((s) => s.customParticipants);

    if (phase !== "selecting") return null;

    const pillars = Array.from({ length: layout.pillarCount }, (_, i) => {
        const pos = pillarPositionOf(i);
        return { ...pos, index: i, label: customParticipants?.[i] || String(i + 1) };
    });

    return (
        <>
            {pillars.map(({ x, z, index, label }) => (
                <Html
                    key={index}
                    position={[x, layout.pillarHeight / 2 + 1.2 + layout.pillarHeight, z]}
                    center
                    zIndexRange={[110, 90]}
                >
                    <button
                        className="pillar-select-btn"
                        aria-label={`${label}の柱を選ぶ`}
                        onClick={() => {
                            soundManager.playSelect();
                            selectPillar(index);
                        }}
                    >
                        <span className="btn-arrow">▼</span>
                        <span className="max-w-[96px] truncate">{label}</span>
                    </button>
                </Html>
            ))}
        </>
    );
}
