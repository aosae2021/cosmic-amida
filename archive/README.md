# Archive

このフォルダには、現在アプリ本体から参照されていない未使用コンポーネント・アセットを退避しています。
`tsconfig.json` および `vitest.config.ts` で除外されているため、ビルド・型チェック・テスト・本番配信（`out/`）には一切含まれません。

- `components/AcrimSat.tsx`: 未使用の人工衛星 3D コンポーネント
- `components/PauseOverlay.tsx`: 未使用のポーズ画面オーバーレイ
- `models/acrimsat.glb`: `AcrimSat.tsx` 用の 3D モデル（約 1.09MB）
