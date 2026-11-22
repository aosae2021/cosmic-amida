import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "プライバシーポリシー",
    description:
        "Cosmic Amida（宇宙を旅する3Dあみだくじ）のプライバシーポリシー、広告配信（Google AdSense等）、アクセス解析、免責事項について記載しています。",
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#04081a] via-[#09122e] to-black text-slate-100">
            <header className="sticky top-0 z-20 border-b border-blue-400/15 bg-[#04081a]/80 backdrop-blur-md">
                <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
                    <Link
                        href="/"
                        className="text-lg font-extrabold tracking-wider text-blue-200 hover:text-white transition-colors"
                    >
                        ✨ Cosmic Amida
                    </Link>
                    <div className="flex items-center gap-4 text-sm">
                        <Link
                            href="/about"
                            className="text-slate-300 hover:text-white transition-colors"
                        >
                            遊び方・FAQ
                        </Link>
                        <Link
                            href="/"
                            className="rounded-full border border-blue-300/60 bg-blue-600/30 px-4 py-1.5 font-semibold text-blue-100 hover:bg-blue-500/40 transition-colors"
                        >
                            3Dあみだくじを遊ぶ
                        </Link>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-4xl px-5 py-12 space-y-10">
                <section className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-300">
                        Privacy Policy
                    </p>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                        プライバシーポリシー
                    </h1>
                    <p className="text-sm text-slate-400">
                        制定日: 2026年11月22日
                    </p>
                    <p className="leading-relaxed text-slate-300">
                        「Cosmic Amida」（以下、「当サイト」といいます）は、利用者のプライバシーを尊重し、個人情報の保護に関する法令を遵守するとともに、以下のプライバシーポリシーに従って適切な管理・運用を行います。
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-bold text-blue-200 border-b border-blue-400/20 pb-2">
                        1. 個人情報の収集と利用目的
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-300">
                        当サイトでは、3Dあみだくじのプレイにあたって氏名・メールアドレス等の個人情報の登録は一切不要です。お問い合わせ等を通じて利用者からご提供いただいた情報がある場合は、お問い合わせへの回答および必要なご連絡のみに利用し、目的外での利用や第三者への提供（法令に基づく場合を除く）は行いません。
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-bold text-blue-200 border-b border-blue-400/20 pb-2">
                        2. 広告の配信について
                    </h2>
                    <div className="space-y-3 text-sm leading-relaxed text-slate-300">
                        <p>
                            当サイトでは、第三者配信の広告サービス（Google AdSense 等）を利用する場合があります。これらの広告配信事業者は、利用者の興味に応じた広告を表示するために Cookie（クッキー）を使用することがあります。
                        </p>
                        <p>
                            Cookie を使用することで当サイトは利用者のコンピュータを識別できるようになりますが、利用者個人を特定するものではありません。
                        </p>
                        <p>
                            Google 広告におけるパーソナライズ広告を無効にする方法や Google AdSense に関する詳細は、
                            <a
                                href="https://policies.google.com/technologies/ads?hl=ja"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-300 underline underline-offset-4 hover:text-blue-200 mx-1"
                            >
                                Google ポリシーと規約（広告）
                            </a>
                            および
                            <a
                                href="https://adssettings.google.com/authenticated"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-300 underline underline-offset-4 hover:text-blue-200 mx-1"
                            >
                                Google 広告設定
                            </a>
                            をご確認ください。また、ブラウザの設定により Cookie を無効にすることも可能です。
                        </p>
                    </div>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-bold text-blue-200 border-b border-blue-400/20 pb-2">
                        3. アクセス解析ツールについて
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-300">
                        当サイトでは、サービス品質向上および利用状況の把握のため、Cloudflare Web Analytics 等のアクセス解析ツールを利用する場合があります。これらのツールは匿名の統計データを収集するものであり、個人を特定する情報は含まれません。
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-bold text-blue-200 border-b border-blue-400/20 pb-2">
                        4. 免責事項
                    </h2>
                    <div className="space-y-2 text-sm leading-relaxed text-slate-300">
                        <p>
                            当サイトのあみだくじ・運勢結果および表示されるメッセージは娯楽を目的としたものであり、特定の事実や将来の出来事を保証するものではありません。
                        </p>
                        <p>
                            当サイトの利用または外部リンク先で提供される情報・サービス等によって生じたいかなる損害についても、当サイトは一切の責任を負いかねます。また、予告なくサービスの内容を変更・中断・終了する場合があります。
                        </p>
                    </div>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-bold text-blue-200 border-b border-blue-400/20 pb-2">
                        5. 著作権・知的財産権について
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-300">
                        当サイトに掲載されている文章・プログラム・オリジナルデザインの著作権は運営者に帰属します（第三者提供のパブリックドメイン素材・オープンソースソフトウェアを除く）。法的に認められる引用の範囲を超えた無断転載・複製はご遠慮ください。
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-bold text-blue-200 border-b border-blue-400/20 pb-2">
                        6. プライバシーポリシーの変更
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-300">
                        当サイトは、法令の変更やサービス内容の更新に応じて、本プライバシーポリシーの内容を適宜見直し、予告なく改定することがあります。改定後のプライバシーポリシーは、本ページに掲載された時点から効力を生じるものとします。
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-bold text-blue-200 border-b border-blue-400/20 pb-2">
                        7. お問い合わせ窓口
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-300">
                        本ポリシーに関するお問い合わせは、
                        <a
                            href="https://github.com/aosae2021/cosmic-amida/issues"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-300 underline underline-offset-4 hover:text-blue-200 mx-1"
                        >
                            GitHub Issues（cosmic-amida）
                        </a>
                        よりご連絡ください。
                    </p>
                </section>
            </main>

            <footer className="border-t border-blue-400/15 py-8 text-center text-xs text-slate-400 space-y-3">
                <div className="flex justify-center gap-6">
                    <Link href="/" className="hover:text-white transition-colors">
                        トップ（3Dあみだくじ）
                    </Link>
                    <Link href="/about" className="hover:text-white transition-colors">
                        遊び方・FAQ
                    </Link>
                    <Link href="/privacy" className="hover:text-white transition-colors">
                        プライバシーポリシー
                    </Link>
                </div>
                <p>© {new Date().getFullYear()} Cosmic Amida</p>
            </footer>
        </div>
    );
}
