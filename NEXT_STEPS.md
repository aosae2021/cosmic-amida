# Cosmic Amida — 次にやること（Next Steps）

> 作成日: 2026-11-22  
> 目的: 3D 宇宙あみだくじ「Cosmic Amida」を **Cloudflare Pages（無料・商用利用可）** で公開し、マネタイズ基盤を整える。  
> ※ 元の Vercel 版（`20260203_amida_happy_everyone`）は実験・デモ用として別リポジトリのまま保持。

---

## 現在の完了状態
- [x] `C:\dev\20261122_cosmic-amida` にクリーンコピー作成
- [x] 第三者 IP モデル（Gundam / Yamato / Ferrari）およびデバッグページの完全除外（`public/` を 3.19MB まで軽量化）
- [x] `next.config.mjs` を Cloudflare Pages 静的出力（`output: "export"`, `images: { unoptimized: true }`）に設定
- [x] `package.json`・`layout.tsx` を `Cosmic Amida` にリブランディング
- [x] ユニットテスト（`npm run test` 8/8 通過）・静的ビルド（`npm run build` → `out/` 出力）・Git 初期コミット完了

---

## 次にやることリスト

### Phase 1: 動作確認 & リリース（Cloudflare Pages 無料公開）
- [x] ローカルで `npm run dev` を起動し、3D シーン（太陽・地球・月・土星・ISS・衛星・彗星）の表示とあみだくじ一連の動作を目視確認（コンソール・ページ・ネットワークエラー 0 件）
- [x] GitHub に新規リポジトリ `cosmic-amida`（`https://github.com/aosae2021/cosmic-amida`）を作成し、`main` ブランチを push
- [x] Cloudflare Pages（`cosmic-amida`）へ静的出力 `out/` を初回デプロイ・公開（`https://cosmic-amida.pages.dev`）
  - **Framework preset**: `Next.js (Static HTML Export)`
  - **Build command**: `npm run build`
  - **Build output directory**: `out`
  - **環境変数**: `NODE_VERSION=22`
- [ ] 公開 URL（`https://cosmic-amida.pages.dev`）でスマホ実機表示確認（※PC ヘッドレスブラウザでの本番確認は完了）

### Phase 2: マネタイズ・審査通過のためのページ整備
- [x] **プライバシーポリシー**ページ（`/privacy`）の作成（広告・アクセス解析・免責事項対応）
- [x] **遊び方・FAQ・運営情報（お問い合わせ）**ページ（`/about`）およびトップ画面からの常設ナビゲーション作成
  - ※ 全画面 3D Canvas だけだと Google AdSense 等の審査で「有用性の低いコンテンツ」になりやすいため必須
- [x] 残存アセット（`public/models/acrimsat.glb`, `textures/`, `sounds/*.wav`）のライセンス確認・`/about` へのクレジット表記
- [x] OGP 画像（`public/og-image.png`）・`robots.txt`・`sitemap.xml`・SNS シェアボタン（結果を X / LINE / URL コピーでシェアできる導線）の実装

### Phase 3: パフォーマンス最適化 & 収益化実装
- [x] `public/sounds/*.wav`（合計 0.64MB）を `.mp3` / `.ogg` に変換して初回ロード軽量化（実通信量 81〜96% 削減）
- [x] 参加者名・景品名の自由入力＆URL共有機能（幹事向けカスタムあみだくじ機能）の実装
- [x] 広告スロットコンポーネント（`AdSlot.tsx`）および Web Analytics / AdSense 環境変数対応の事前組み込み
- [ ] Cloudflare Web Analytics トークン発行・環境変数設定（`NEXT_PUBLIC_CF_BEACON_TOKEN`）

### 今後の目標（Future / Step-up Goals）
- [ ] 独自ドメイン取得（例: `cosmic-amida.com`）＆ Cloudflare Pages へのカスタムドメイン設定（Google AdSense 審査を目指すタイミングで実施）
- [ ] 広告審査申請（AdSense / 忍者AdMax 等）＆環境変数設定（`NEXT_PUBLIC_ADSENSE_CLIENT` / `NEXT_PUBLIC_ADSENSE_SLOT_RESULT`）による収益化稼働
- [ ] プレミアムテーマ課金（Stripe + Cloudflare Workers）などの拡張機能検討
