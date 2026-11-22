import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";
import "../styles/layers.css";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL = "https://cosmic-amida.pages.dev";
const SITE_NAME = "Cosmic Amida";
const SITE_TITLE = "Cosmic Amida | 宇宙を旅する3Dあみだくじ";
const SITE_DESCRIPTION =
    "宇宙空間に浮かぶ運命の装置。太陽や地球、土星、衛星が巡る広大な宇宙を舞台に、光と音の演出で運勢を占う無料3Dあみだくじアプリ。";
const CF_BEACON_TOKEN = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

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

                {/* Cloudflare Web Analytics（環境変数 NEXT_PUBLIC_CF_BEACON_TOKEN 設定時に自動有効化） */}
                {CF_BEACON_TOKEN && (
                    <Script
                        src="https://static.cloudflareinsights.com/beacon.min.js"
                        data-cf-beacon={JSON.stringify({ token: CF_BEACON_TOKEN })}
                        strategy="afterInteractive"
                    />
                )}

                {/* Google AdSense（環境変数 NEXT_PUBLIC_ADSENSE_CLIENT 設定時に自動有効化） */}
                {ADSENSE_CLIENT && (
                    <Script
                        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
                        crossOrigin="anonymous"
                        strategy="afterInteractive"
                    />
                )}
            </body>
        </html>
    );
}
