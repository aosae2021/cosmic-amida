import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "遊び方・FAQ・運営情報",
    description:
        "宇宙を旅する3Dあみだくじ「Cosmic Amida」の遊び方、操作方法、よくある質問（FAQ）、使用アセットのライセンス・クレジット、運営情報をまとめています。",
};

const FAQ_ITEMS = [
    {
        q: "利用料金はかかりますか？",
        a: "完全無料でお楽しみいただけます。会員登録やアプリのインストールも不要で、PC・スマートフォンのブラウザからすぐにご利用いただけます。",
    },
    {
        q: "あみだくじの結果は毎回ランダムですか？",
        a: "はい。プレイするたびに横線（ブリッジ）の配置と各柱の運勢（大吉・中吉・小吉・吉・末吉）がランダムに生成されます。選んだ柱から実際のあみだくじの経路を正確にたどって結果が決まります。",
    },
    {
        q: "スマートフォンでも遊べますか？",
        a: "はい。iOS Safari や Android Chrome などのモダンブラウザに対応しています。モバイル端末では自動的に描画解像度やエフェクトを最適化し、快適に動作するよう調整しています。",
    },
    {
        q: "3D画面が表示されない・動作が重い場合は？",
        a: "Cosmic Amida は WebGL を使用して3D空間を描画しています。ブラウザのハードウェアアクセラレーションが有効になっているかご確認のうえ、最新版の Chrome / Safari / Edge / Firefox でお試しください。",
    },
    {
        q: "演出をスキップしてすぐに結果を見ることはできますか？",
        a: "はい。画面左上の「スキップ」ボタンを押すことで、3D演出を待たずにすぐ結果画面へ進むことができます。また、OS の「視差効果を減らす（Reduced Motion）」設定がオンの場合は自動的に簡易演出になります。",
    },
    {
        q: "結果をSNSでシェアできますか？",
        a: "はい。結果画面に表示される「Xでシェア」「LINEで送る」「結果をコピー」ボタンから、出た運勢とメッセージを友達やフォロワーに簡単に共有できます。",
    },
];

export default function AboutPage() {
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
                            href="/privacy"
                            className="text-slate-300 hover:text-white transition-colors"
                        >
                            プライバシーポリシー
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

            <main className="mx-auto max-w-4xl px-5 py-12 space-y-14">
                {/* ヒーロー */}
                <section className="space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-300">
                        About &amp; Guide
                    </p>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                        Cosmic Amida について・遊び方
                    </h1>
                    <p className="leading-relaxed text-slate-300">
                        <strong>Cosmic Amida（コズミック・アミダ）</strong>は、太陽・地球・月・土星・国際宇宙ステーション（ISS）・人工衛星・彗星が浮かぶ広大な3D宇宙空間を舞台にした、ブラウザで遊べる無料の3DあみだくじWebアプリです。
                        柱を選んでから結果にたどり着くまでの道のりを、ダイナミックなカメラワークと光・音の演出でお楽しみいただけます。
                    </p>
                </section>

                {/* 遊び方 */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold text-blue-200 border-b border-blue-400/20 pb-2">
                        遊び方（3ステップ）
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="rounded-2xl border border-blue-300/20 bg-slate-900/60 p-5 space-y-2">
                            <div className="text-xs font-bold tracking-widest text-blue-300">STEP 1</div>
                            <h3 className="text-lg font-bold text-white">柱を選ぶ</h3>
                            <p className="text-sm leading-relaxed text-slate-300">
                                宇宙空間に並ぶ5本の光の柱から、直感で好きな番号（1〜5）のボタンをタップ・クリックします。ドラッグで視点をぐるっと回転させて宇宙を眺めることもできます。
                            </p>
                        </div>
                        <div className="rounded-2xl border border-blue-300/20 bg-slate-900/60 p-5 space-y-2">
                            <div className="text-xs font-bold tracking-widest text-blue-300">STEP 2</div>
                            <h3 className="text-lg font-bold text-white">宇宙の旅を見守る</h3>
                            <p className="text-sm leading-relaxed text-slate-300">
                                カウントダウンの後、光の玉があなたの選んだ柱から出発し、ランダムに張られた魔法の横線（ブリッジ）を渡りながらゴールへと向かいます。
                            </p>
                        </div>
                        <div className="rounded-2xl border border-blue-300/20 bg-slate-900/60 p-5 space-y-2">
                            <div className="text-xs font-bold tracking-widest text-blue-300">STEP 3</div>
                            <h3 className="text-lg font-bold text-white">運勢発表＆シェア</h3>
                            <p className="text-sm leading-relaxed text-slate-300">
                                ゴールに到達すると紙吹雪と専用ジングルで運勢と応援メッセージが表示されます。結果は X や LINE ですぐにシェアしたり、何度でも再挑戦できます。
                            </p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-indigo-400/20 bg-indigo-950/30 p-5 space-y-2 text-sm text-slate-300">
                        <h3 className="font-bold text-indigo-200">操作のヒント</h3>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>視点操作</strong>: 柱選択画面では画面をドラッグ（スワイプ）して3D空間の角度を自由に変えられます。</li>
                            <li><strong>音量調整</strong>: 画面右下のボリュームスライダーでBGM・効果音の音量を調整・ミュートできます。</li>
                            <li><strong>スキップ機能</strong>: 画面左上の「スキップ」ボタンから即座に結果画面へ移動できます。</li>
                        </ul>
                    </div>
                </section>

                {/* FAQ */}
                <section className="space-y-5">
                    <h2 className="text-2xl font-bold text-blue-200 border-b border-blue-400/20 pb-2">
                        よくある質問（FAQ）
                    </h2>
                    <div className="space-y-4">
                        {FAQ_ITEMS.map((item) => (
                            <div
                                key={item.q}
                                className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-5 space-y-2"
                            >
                                <h3 className="font-bold text-white">Q. {item.q}</h3>
                                <p className="text-sm leading-relaxed text-slate-300">
                                    A. {item.a}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 使用アセット・クレジット */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-blue-200 border-b border-blue-400/20 pb-2">
                        使用アセット・クレジット
                    </h2>
                    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-5 space-y-3 text-sm leading-relaxed text-slate-300">
                        <ul className="list-disc pl-5 space-y-2">
                            <li>
                                <strong>宇宙オブジェクト・天体表現</strong>: 太陽・土星などのサーフェステクスチャおよび Three.js / GLSL シェーダー・Canvas によるプロシージャル 3D モデル・パーティクルを組み合わせて描画しています。
                            </li>
                            <li>
                                <strong>効果音・サウンド</strong>: Web Audio API によるプロシージャル音響合成とオリジナル／ロイヤリティフリー音源を使用しています。
                            </li>
                            <li>
                                <strong>主な使用オープンソース技術</strong>: Next.js, React, Three.js, React Three Fiber, drei, postprocessing, Framer Motion, Howler.js, canvas-confetti, Tailwind CSS, Zustand。
                            </li>
                        </ul>
                    </div>
                </section>

                {/* 運営情報・お問い合わせ */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-blue-200 border-b border-blue-400/20 pb-2">
                        運営情報・お問い合わせ
                    </h2>
                    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-5 text-sm leading-relaxed text-slate-300 space-y-2">
                        <p><strong>サイト名</strong>: Cosmic Amida</p>
                        <p><strong>運営者</strong>: Cosmic Amida 制作チーム（GitHub: aosae2021）</p>
                        <p>
                            <strong>お問い合わせ・不具合報告</strong>: ご意見・不具合のご報告・権利表記に関するお問い合わせは、以下の GitHub リポジトリの Issues よりご連絡ください。
                        </p>
                        <p>
                            <a
                                href="https://github.com/aosae2021/cosmic-amida/issues"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-300 underline underline-offset-4 hover:text-blue-200"
                            >
                                https://github.com/aosae2021/cosmic-amida/issues
                            </a>
                        </p>
                    </div>
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
