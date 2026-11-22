"use client";

/**
 * AdSlot.tsx
 *
 * 収益化用広告スロットコンポーネント（Google AdSense 等対応）。
 * - 環境変数 NEXT_PUBLIC_ADSENSE_CLIENT と slot が設定されている場合のみ描画する。
 * - 未設定時（審査前・ローカル開発時）は何も描画せず、レイアウトやコンソールに影響を与えない。
 * - 誤タップ防止のため十分な余白と「スポンサーリンク」ラベルを備える。
 */

import { useEffect, useRef } from "react";

declare global {
    interface Window {
        adsbygoogle?: unknown[];
    }
}

interface AdSlotProps {
    slot?: string;
    className?: string;
}

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export default function AdSlot({ slot, className = "" }: AdSlotProps) {
    const pushedRef = useRef(false);
    const resolvedSlot = slot || process.env.NEXT_PUBLIC_ADSENSE_SLOT_RESULT;

    useEffect(() => {
        if (!ADSENSE_CLIENT || !resolvedSlot || pushedRef.current) return;
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            pushedRef.current = true;
        } catch {
            // 広告ブロッカーやスクリプト未読込時は静かに無視
        }
    }, [resolvedSlot]);

    if (!ADSENSE_CLIENT || !resolvedSlot) {
        return null;
    }

    return (
        <aside
            aria-label="広告"
            className={`w-full max-w-md mx-auto text-center ${className}`}
        >
            <p className="mb-1 text-[10px] tracking-widest text-slate-400/80">
                スポンサーリンク
            </p>
            <ins
                className="adsbygoogle"
                style={{ display: "block", minHeight: "60px" }}
                data-ad-client={ADSENSE_CLIENT}
                data-ad-slot={resolvedSlot}
                data-ad-format="horizontal"
                data-full-width-responsive="true"
            />
        </aside>
    );
}
