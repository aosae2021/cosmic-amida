import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "../styles/layers.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Cosmic Amida | 宇宙を旅する3Dあみだくじ",
    description:
        "宇宙空間に浮かぶ運命の装置。React Three Fiber で実現した没入感ある3Dあみだくじ。",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ja" suppressHydrationWarning>
            <body className={inter.className} suppressHydrationWarning>{children}</body>
        </html>
    );
}
