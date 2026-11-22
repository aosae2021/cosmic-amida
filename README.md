# Cosmic Amida

宇宙空間を旅する 3D あみだくじ Web アプリ（Cloudflare Pages 商用運用向けクリーン版）。

## 開発サーバー起動

```powershell
npm install
npm run dev
```

## ビルド・テスト

```powershell
npm run test
npm run build
```

`npm run build` により `out/` ディレクトリに静的ファイルが出力されます。

## Cloudflare Pages 設定値

- **Framework preset**: `Next.js (Static HTML Export)`
- **Build command**: `npm run build`
- **Build output directory**: `out`
- **Node.js version**: `20` 以上（環境変数 `NODE_VERSION=22` 推奨）
