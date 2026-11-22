"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Leva } from "leva";

const AmidaGame = dynamic(
    () => import("./_components/AmidaGame"),
    {
        ssr: false,
        loading: () => (
            <div className="loading-screen">
                <span>✨ Cosmic Amida ✨</span>
            </div>
        ),
    }
);

export default function Home() {
    return (
        <main className="relative w-screen h-screen overflow-hidden bg-black">
            <Leva hidden />
            <AmidaGame />

            {/* 常設ナビゲーション（クローラーおよびユーザー向け：遊び方・プライバシーポリシー） */}
            <nav
                aria-label="サイト情報"
                className="fixed bottom-4 left-4 z-[350] flex items-center gap-2 rounded-full border border-blue-300/25 bg-slate-950/65 px-3.5 py-1.5 text-xs text-blue-100/90 backdrop-blur-md shadow-lg"
            >
                <Link
                    href="/about"
                    className="transition-colors hover:text-white underline-offset-4 hover:underline"
                >
                    遊び方・FAQ
                </Link>
                <span className="text-blue-300/40" aria-hidden="true">|</span>
                <Link
                    href="/privacy"
                    className="transition-colors hover:text-white underline-offset-4 hover:underline"
                >
                    プライバシーポリシー
                </Link>
            </nav>
        </main>
    );
}
