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
- [ ] ローカルで `npm run dev` を起動し、3D シーン（太陽・地球・月・土星・ISS・衛星・彗星）の表示とあみだくじ一連の動作を目視確認
- [ ] GitHub に新規リポジトリ `cosmic-amida` を作成し、`main` ブランチを push
- [ ] Cloudflare Pages にリポジトリを連携して初回デプロイ
  - **Framework preset**: `Next.js (Static HTML Export)`
  - **Build command**: `npm run build`
  - **Build output directory**: `out`
  - **環境変数**: `NODE_VERSION=22`
- [ ] 公開 URL（`*.pages.dev`）でスマホ実機＆PC 表示確認

### Phase 2: マネタイズ・審査通過のためのページ整備
- [ ] **プライバシーポリシー**ページ（`/privacy`）の作成（広告・アクセス解析対応）
- [ ] **遊び方・FAQ・運営情報（お問い合わせ）**ページ（`/about` またはトップ下部の展開セクション）の作成
  - ※ 全画面 3D Canvas だけだと Google AdSense 等の審査で「有用性の低いコンテンツ」になりやすいため必須
- [ ] 残存アセット（`public/models/acrimsat.glb`, `textures/`, `sounds/*.wav`）のライセンス確認・必要に応じたクレジット表記または差し替え
- [ ] OGP 画像・SNS シェアボタン（結果を X / LINE でシェアできる導線）の実装

### Phase 3: パフォーマンス最適化 & 収益化実装
- [ ] `public/sounds/*.wav`（合計 0.64MB）を `.mp3` / `.ogg` に変換して初回ロード軽量化
- [ ] 独自ドメイン取得（例: `cosmic-amida.com`）＆ Cloudflare Pages へのカスタムドメイン設定
- [ ] Cloudflare Web Analytics（無料・Cookie レス）の導入
- [ ] 収益化手段の実装（以下のいずれか・または組み合わせ）
  - **広告**: 結果画面下部など誤タップを誘発しない位置へのバナー配置（AdSense / 忍者AdMax 等）
  - **カスタム機能・課金**: 参加者名・景品名の自由入力＆URL共有機能（幹事向けツール化）、テーマ課金（Stripe + Cloudflare Workers）など
