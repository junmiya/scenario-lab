# Contract: Data Migration（contentType / supportedModes）

既存 Firestore データへ `contentType` / `supportedModes` を正規化する 2 段階バッチ。**読み取りフォールバック（未設定→脚本相当）があるため、マイグレーションは「正規化」であり「機能の前提」ではない**（R-02）。完了前でも UI は正しく動作する。

## 実行方式

- **スクリプト**: `scripts/migrate-content-type.ts`（firebase-admin、`scenario-lab-studio` プロジェクト）
- **冪等性**: 既に値があるドキュメントはスキップ（再実行安全）。
- **dry-run**: `--dry-run` で件数のみ出力、書込なし。
- **バッチ**: Firestore `writeBatch`（最大 500 件/バッチ）で分割実行。

## Stage 1: scripts → contentType

- **対象**: `scripts/{id}` のうち `contentType` 未設定の全件
- **書込**: `contentType = 'screenplay'`
- **不変条件**: 既存フィールドは一切変更しない（`updatedAt` も触らない＝ユーザー作品の更新時刻を汚さない）。

## Stage 2: contests → supportedModes

- **対象**: `contests/{id}` のうち `supportedModes` 未設定の全件
- **書込**: `supportedModes = 'screenplayOnly'`
- **同時**: 既存 `contests/{id}/entries/{entryId}` に `contentType = 'screenplay'`、`groups/{id}/submissions/{id}` に `contentType = 'screenplay'` を付与（任意・第2パス）。

## 事前条件

- 実行前に **Firestore エクスポート（バックアップ）取得**（`gcloud firestore export`）。
- ロールバック手順を `release-rollback`（001 の `release-rollback.md` に追記）に記載。

## ロールバック

- 不具合時は **UI フラグ `novelMode` をオフ**（`config/features`）にして小説機能を即停止。データ（`contentType` / `supportedModes`）は保持して問題ない（脚本挙動に影響しない）。
- データを巻き戻す必要がある場合のみ、取得済みエクスポートから復元。

## 検証

- Stage 完了後、`contentType` / `supportedModes` 未設定件数が 0 であることをクエリで確認。
- 既存脚本ドキュメントの編集・エクスポート・応募がリグレッションなく動作（SC-005 / SC-009）。

## Firestore ルール変更（同伴）

- `scripts/{id}` の update で `contentType` の値が変化する更新を拒否（不変性、FR-005/CA-003）:
  - `request.resource.data.contentType == resource.data.contentType`（既存値がある場合）。
- `contests/{id}` は既存ルール（認証ユーザー）を踏襲。`supportedModes` の検証はアプリ／functions 層で実施。
