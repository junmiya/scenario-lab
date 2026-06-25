# Contract: Advice API（小説モード拡張）

既存 `001-build-scenario-writing/contracts/advice-api.md` を拡張。`contentType` を追加し、サーバー側でプロンプトテンプレートをモード別に選択する。脚本の既存挙動は `contentType` 省略時のフォールバックで完全互換。

## Endpoint: Generate Dual Advice

- **Method**: `POST`
- **Path**: `/api/advice/generate`
- **Auth**: Required
- **Request Body**:
  - `documentId` (string)
  - `contentType` (`screenplay` | `novel`, optional) — **省略時 `screenplay`**（後方互換）
  - `synopsis` (string)
  - `content` (string) — 小説時は章・節を連結したプレーン本文を渡す
  - `selectedText` (string, optional)
  - `panelAProvider` / `panelBProvider` (`gemini` | `openai` | `anthropic`)
  - `panelAPreset` / `panelBPreset` (string)
  - `worldbuilding` (object, optional) — 小説時のみ。`{ characters, worldview, timeline, glossary }` を要約してプロンプトに付与
- **Behavior**:
  - `contentType === 'novel'` → `functions/src/advice/prompts/novel.ts`（パネルA=編集者 / パネルB=文芸評論家）
  - `contentType === 'screenplay'`（or 省略）→ `functions/src/advice/prompts/screenplay.ts`（既存 STRUCTURE/EMOTIONAL）
  - レスポンス構造はモード非依存（既存 `panelA` / `panelB` 形状を維持）
- **Response**:
  - `panelA` (object: `provider`, `structureFeedback`, `emotionalFeedback`)
  - `panelB` (object: `provider`, `structureFeedback`, `emotionalFeedback`)
- **構造化ログ**: `contentType` を `buildLogContext` のフィールドに含める（CA-005）。

### モード混線防止（SC-007）

- 小説プロンプト応答に脚本特有語（柱・ト書き・セリフ・ペラ）が出力プロンプトへ混入しないこと。
- 脚本プロンプト応答に小説特有語（地の文・章タイトル）が混入しないこと。
- 契約テスト: `contentType` ごとにテンプレート文字列をスナップショット検証。

## Endpoint: List Available Models

- **Method**: `GET`
- **Path**: `/api/advice/models`
- **Auth**: Required
- **Response**: Enabled model descriptors（モード非依存。変更なし）

## Error Contract

- `400 Bad Request`: 無効な `contentType` / パネル設定 / コンテキスト欠如
- `401 Unauthorized`: 認証なし
- `403 Forbidden`: ドキュメントアクセス拒否
- `429 Too Many Requests`: アドバイスレート制限（既存 30/60s）
- `502 Provider Error`: 上流プロバイダ失敗
- `504 Gateway Timeout`: プロバイダタイムアウト（既存）
- `500 Internal Error`: 想定外。correlation id 付き
