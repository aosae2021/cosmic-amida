import type { Metadata } from "next";
import WarikanApp from "./_components/WarikanApp";

export const metadata: Metadata = {
    title: "宇宙割り勘あみだくじ（飲み会・忘年会）",
    description:
        "ただの飲み会の割り勘を宇宙規模の3Dあみだくじで決める無料ツール。連打ゲームで順番決定、1人無料・均等・プラマイ率ランダム＋1人あたり最大金額（上限）設定に対応。",
    openGraph: {
        title: "宇宙割り勘あみだくじ | Cosmic Amida",
        description:
            "飲み会・忘年会の割り勘を連打ゲーム＆3D宇宙あみだくじで盛り上げる！1人無料・ランダム傾斜・最大金額キャップ対応。",
        images: ["/og-image.png"],
    },
};

export default function WarikanPage() {
    return <WarikanApp />;
}
