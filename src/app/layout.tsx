import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "../styles/layers.css";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL = "https://cosmic-amida.pages.dev";
const SITE_NAME = "Cosmic Amida";
const SITE_TITLE = "Cosmic Amida | 宇宙を旅する3Dあみだくじ";
const SITE_DESCRIPTION =
    "宇宙空間に浮かぶ運命の装置。太陽や地球、土星、衛星が巡る広大な宇宙を舞台に、光と音の演出で運勢を占う無料3Dあみだくじアプリ。";

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: SITE_TITLE,
        template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    keywords: [
        "Cosmic Amida",
        "3Dあみだくじ",
        "あみだくじ",
        "宇宙",
        "おみくじ",
        "運勢",
        "無料ゲーム",
        "Three.js",
        "WebGL",
    ],
    openGraph: {
        type: "website",
        locale: "ja_JP",
        url: SITE_URL,
        siteName: SITE_NAME,
        title: SITE_TITLE,
        description: SITE_DESCRIPTION,
        images: [
            {
                url: "/og-image.png",
                width: 1200,
                height: 630,
                alt: "Cosmic Amida — 宇宙を旅する3Dあみだくじ",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: SITE_TITLE,
        description: SITE_DESCRIPTION,
        images: ["/og-image.png"],
    },
    robots: {
        index: true,
        follow: true,
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ja" suppressHydrationWarning>
            <body className={inter.className} suppressHydrationWarning>
                {children}
            </body>
        </html>
    );
}
