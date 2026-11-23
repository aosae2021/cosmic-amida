# Cosmic Amida

太陽や地球、土星、人工衛星が巡る 3D 宇宙空間を舞台にした、ブラウザで遊べる無料の 3D あみだくじ Web アプリです（Cloudflare Pages 静的出力・商用運用対応）。

- **本番公開 URL**: https://cosmic-amida.pages.dev
- **飲み会・宇宙割り勘モード**: https://cosmic-amida.pages.dev/warikan
- **遊び方・FAQ**: https://cosmic-amida.pages.dev/about

## 主なモード・機能

- **🍻 飲み会・宇宙割り勘（`/warikan`）**: 2〜8人対応、合計金額・1人あたり最大上限（あり/なし）、均等・1人無料・プラマイ率ランダム、2次会軍資金（500円/1,000円切り上げ）、連打ゲーム順番決め、4幕シネマティック 3D 火花演出、ズッコケ音・泣きの1回（天丼判定）・男気肩代わり（敬天愛人）、LINE/X 精算表シェア
- **🔮 3D 宇宙おみくじ（`/`）**: 太陽・惑星・彗星が巡る 3D 空間で運勢（大吉〜末吉）を占い、X / LINE / コピーでシェア
- **⚙️ カスタムあみだくじ（`/` 内モーダル）**: ランチ決め・景品抽選・担当決めなどの参加者名・景品名を自由入力し、クエリ付き URL でそのまま共有

## Quick Start

```powershell
npm install
npm run dev
```

開発サーバーが `http://localhost:3000`（使用中の場合は空きポート）で起動します。

## コマンド一覧

| コマンド | 説明 |
|---|---|
| `npm run dev` | ローカル開発サーバー起動 |
| `npm run test` | Vitest ユニットテスト実行（ロジック・ストア検証） |
| `npm run build` | 本番用静的ビルド（`out/` へ出力） |
| `npm run test:e2e` | Playwright E2E テスト実行（`PLAYWRIGHT_BASE_URL` で本番 URL 指定可） |
| `npx wrangler pages deploy out --project-name=cosmic-amida --branch=main` | Cloudflare Pages へ `out/` をデプロイ |

## 環境変数（任意・オプトイン）

未設定のままでも全機能がエラーなく動作します。計測・広告を有効化する場合のみ Cloudflare Pages の環境変数に設定して再ビルドしてください。

| 変数名 | 用途 |
|---|---|
| `NODE_VERSION` | Cloudflare Pages ビルド環境向け（`22` 推奨） |
| `NEXT_PUBLIC_CF_BEACON_TOKEN` | Cloudflare Web Analytics（無料・Cookie レス）のトークン |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | Google AdSense パブリッシャー ID（例: `ca-pub-...`） |
| `NEXT_PUBLIC_ADSENSE_SLOT_RESULT` | 結果画面・精算表下部の広告スロット ID |

## Cloudflare Pages 設定値

- **Framework preset**: `Next.js (Static HTML Export)`
- **Build command**: `npm run build`
- **Build output directory**: `out`
- **Node.js version**: `22`

## Architecture & Docs

全体構成図（Mermaid）・主要な設計判断（ADR）・壊してはいけない制約は以下を参照してください。

- **アーキテクチャ・関係図・ADR**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **今後のロードマップ・残タスク**: [NEXT_STEPS.md](NEXT_STEPS.md)
