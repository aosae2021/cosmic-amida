/**
 * app/page.tsx (Server Component)
 * SSR対策: AmidaGame を dynamic import で ssr: false。
 */

"use client";

import dynamic from "next/dynamic";
import { Leva } from "leva";

const AmidaGame = dynamic(
    () => import("./_components/AmidaGame"),
    {
        ssr: false,
        loading: () => (
            <div className="loading-screen">
                <span>✨ Fortune Flow 3D ✨</span>
            </div>
        ),
    }
);

export default function Home() {
    return (
        <main className="w-screen h-screen overflow-hidden bg-black">
            <Leva hidden />
            <AmidaGame />
        </main>
    );
}
