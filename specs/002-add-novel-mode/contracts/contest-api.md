# Contract: Contest / Submission API（小説モード対応・P4）

コンテスト・グループ提出に `supportedModes` / `contentType` を導入し、UI フィルタとサーバー検証の二重防御で不整合応募を防ぐ。既存「脚本のみ」フローはマイグレーションで完全互換。

実装は Firestore 直アクセス（client SDK）＋ functions 検証の併用。応募・提出の整合性検証は **サーバー側（functions）を権威**とする（CA-003）。

## Contest 作成

- **操作**: `createContest`（client）/ 管理 UI（`ContestCreatePage`）
- **追加フィールド**: `supportedModes` (`screenplayOnly` | `novelOnly` | `both`) — **必須選択、既定 `screenplayOnly`**（FR-022）
- **検証**: 値は 3 値のいずれか。未指定はマイグレーション／作成時に `screenplayOnly`。

## Contest 応募

- **操作**: `createContestEntry`（client）→ functions 検証
- **Path（検証 API）**: `POST /api/contests/{contestId}/entries`
- **Auth**: Required
- **Request Body**: `scriptId`, `contentType`（応募作品のモード）
- **Behavior**:
  - 応募 UI は `supportedModes` で候補作品をフィルタ（脚本のみコンテストに小説を出さない、FR-023）
  - サーバーは entry の `contentType` と contest の `supportedModes` を突合:
    - `screenplayOnly` ↔ `screenplay` のみ可
    - `novelOnly` ↔ `novel` のみ可
    - `both` ↔ どちらも可
  - 不整合 → **403 Forbidden**（`error: CONTENT_TYPE_NOT_ALLOWED`、correlation id 付き）
- **スナップショット**: `ContestEntry.scriptSnapshot` に `contentType` を保持。小説作品は `novelContent` 概要も格納（章一覧表示用）。

## Group 提出

- **操作**: `createSubmission`（client）
- **追加フィールド**: `GroupSubmission.contentType` / `ScriptSnapshot.contentType`
- **Behavior**: グループ作品一覧（`GroupDetailPage`）はモードバッジ＋「すべて/脚本/小説」フィルタを表示（FR-024）。提出自体はモード制限なし（混在チーム許容）。

## Submission / Correction 閲覧

- **対象**: `SubmissionViewPage` / `ContestEntryPage` / `CorrectionPage`
- **Behavior**: `contentType` を判定し、
  - `novel` → 章一覧パネル表示、AI アドバイスは小説プロンプト（編集者/文芸評論家）
  - `screenplay` → 既存挙動を維持（FR-025）
- **添削（Correction）**: `field` 対象が小説では `novelContent` 由来になりうるため、`field` に `novelChapter` を追加可能（任意拡張、本フェーズでは `content` 連結文字列へのオフセットで互換維持）。

## Error Contract

- `400 Bad Request`: 無効な `supportedModes` / `contentType`
- `401 Unauthorized`: 認証なし
- `403 Forbidden`: `CONTENT_TYPE_NOT_ALLOWED`（モード不整合応募）、またはアクセス権なし
- `404 Not Found`: コンテスト／作品が存在しない
- `500 Internal Error`: 想定外。correlation id 付き

## 後方互換

- 既存コンテストはマイグレーションで `supportedModes: 'screenplayOnly'` を自動付与（手動再設定不要、Edge Case）。
- 既存応募・提出（`contentType` 未設定）は読み取り時 `screenplay` とみなす。
- リグレッション検証: US5-5 / SC-009（30 日ゼロ件）。
