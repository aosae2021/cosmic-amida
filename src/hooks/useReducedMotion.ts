/**
 * useReducedMotion.ts
 * `prefers-reduced-motion` メディアクエリをクライアントサイドで検出する。
 *
 * SSR 安全: useState の初期値を false にし、useEffect で matchMedia を読む。
 * true の場合は降下アニメーションをスキップして即 'result' フェーズへ。
 */

"use client";

import { useEffect, useState } from "react";

/**
 * prefers-reduced-motion が有効かどうかを返すフック。
 * @returns true = モーション軽減が有効（アニメーションをスキップすべき）
 */
export function useReducedMotion(): boolean {
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        setReduced(mq.matches);

        const handler = (e: MediaQueryListEvent): void => {
            setReduced(e.matches);
        };

        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    return reduced;
}
