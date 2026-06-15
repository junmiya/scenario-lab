# Phase 1 Data Model: 小説モード追加

**Feature**: `002-add-novel-mode` | **Date**: 2026-06-13

既存の `FirestoreScript`（`scripts` コレクション）/ `Contest` / `ScriptSnapshot` を拡張する。新規コレクションは作らず、ドキュメント内ネストで章・節と設定資料を表現する。型は `frontend/src/lib/firebase/firestoreService.ts` と `frontend/src/stores/editorStore.ts` に対応。

---

## 1. Document（`scripts/{id}` 拡張）

既存 `FirestoreScript` に以下を追加。脚本・小説で共有するコレクション。

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `contentType` | `'screenplay' \| 'novel'` | 追加（任意） | **未設定は `'screenplay'` とみなす**。作成後は不変（FR-005）。 |
| `novelContent` | `NovelContent`（下記） | 小説時のみ | 章・節のネスト構造。脚本では未使用。 |
| `novelSettings` | `NovelSettings`（下記） | 小説時のみ | 書字方向・原稿用紙設定。 |
| `worldbuilding` | `Worldbuilding`（下記） | 小説時の任意 | 人物/世界観/年表/用語集の 4 フィールド。 |
| `novelCommentary` | `{ editor: any[]; critic: any[] }` | 小説時の任意 | 小説 AI アドバイス（編集者/文芸評論家）の保存。脚本の `contentCommentary` と対。 |

既存フィールド（`title`, `authorName`, `synopsis`, `content`, `characterText`, `characters[]`, `settings`, `contentCommentary`, `synopsisCommentary`, …）は不変。脚本ドキュメントは従来どおり `content`（プレーン文字列）を使う。

**バリデーション**:
- `contentType` は作成時のみ書込可。更新で値が変わる更新は Firestore ルールで拒否（不変性）。
- `novelContent` が存在する場合 `contentType === 'novel'` でなければ不整合（保存前にクライアント検証）。

---

## 2. NovelContent（章・節ネスト構造）

```ts
interface NovelChapter {
  id: string;          // UUID
  title: string;       // 章タイトル（空可）
  order: number;       // 章の並び順（0 始まり）
  body: string;        // 章直下の本文（節を持たない場合の本体）
  sections?: NovelSection[]; // 任意。節（2 階層目）
}

interface NovelSection {
  id: string;
  title: string;
  order: number;
  body: string;
}

interface NovelContent {
  chapters: NovelChapter[];
}
```

**ルール**:
- 階層は **章 ＞ 節の 2 階層固定**。`NovelSection` はさらに子を持てない（3 階層禁止）。
- 章ゼロの小説は単一プレーン本文として扱い、エクスポート時に見出しを出さない（Edge Case）。
- 節を持たない章は docx で「見出し1」のみ出力（FR-017）。
- `order` は連番でなくてもよいが、表示・エクスポートは `order` 昇順。

**進行率メトリクス**（章一覧パネル FR-008 用、永続化しない計算値）:
- 章ごとの字数 = `body` ＋ 全 `sections[].body` の改行除外文字数。
- 全体進行率 = 総字数 / （`lineLength × linesPerPage × pageCount`）。既存 `recalculateGuideMetrics` を流用。

---

## 3. NovelSettings（小説固有設定）

```ts
interface NovelSettings {
  writingDirection: 'vertical' | 'horizontal'; // 既定 'vertical'（Q1）
  lineLength: number;     // 既定 20（Q2）
  linesPerPage: number;   // 既定 20（Q2 = 400字詰め原稿用紙）
  pageCount: number;      // 任意。ガイドメトリクス用
}
```

既存 `EditorSettings`（`lineLength` / `linesPerPage` / `pageCount`）を内包し、`writingDirection` を追加した上位互換。設定変更は編集中も可、データ損失なし（FR-007）。

---

## 4. Worldbuilding（設定資料 4 フィールド・Q4）

すべて任意項目（空でも執筆・保存可）。

```ts
interface WorldbuildingCharacter {  // 既存 characters[] を流用
  id: string; name: string; age?: string; traits?: string;
  background?: string; relationships?: string; notes?: string;
}
interface TimelineEntry { id: string; when: string; event: string; related?: string; }
interface GlossaryEntry { id: string; term: string; reading?: string; description: string; }

interface Worldbuilding {
  characters: WorldbuildingCharacter[]; // 人物（CharacterTable 流用）
  worldview: string;                    // 世界観（自由記述リッチテキスト）
  timeline: TimelineEntry[];            // 年表（表形式）
  glossary: GlossaryEntry[];            // 用語集（表形式）
}
```

AI アドバイス時、各フィールドはラベル付きでプロンプトへ渡す（例:「以下の年表との整合性を踏まえて評価せよ」FR-015）。

---

## 5. ExportPreset（`FormatPreset` 拡張）

| フィールド | 型 | 説明 |
|---|---|---|
| `supportedModes` | `('screenplay' \| 'novel')[]` | 追加。モード非互換のプリセットは選択肢から除外（FR-016）。未設定は `['screenplay']` とみなす。 |

小説プリセット（コード定義、ユーザー保存とは別）:
- `縦書き原稿用紙` — vertical, 20×20, 章=見出し1/節=見出し2
- `文庫横書き` — horizontal, 書籍レイアウト
- `Web小説プレーン` — プレーンテキスト（カクヨム/なろう投稿形式）

---

## 6. AdviceSession / API ペイロード拡張

| フィールド | 型 | 説明 |
|---|---|---|
| `contentType` | `'screenplay' \| 'novel'` | 追加。どちらのプロンプトで生成したかをトレース（FR-012, CA-005）。 |

`/api/advice/generate` リクエストに `contentType` を追加。`providerGateway` がテンプレートを選択。詳細は [contracts/advice-api.md](./contracts/advice-api.md)。

---

## 7. Contest（`contests/{id}` 拡張・P4）

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `supportedModes` | `'screenplayOnly' \| 'novelOnly' \| 'both'` | 追加 | 既定 `screenplayOnly`。既存はマイグレーションで設定（FR-022）。 |

`ContestEntry` / `GroupSubmission` / `ScriptSnapshot` に `contentType: 'screenplay' \| 'novel'` を追加し、応募・提出スナップショットがモードを保持する（FR-023/FR-025）。

**バリデーション**:
- 応募時、entry の `contentType` がコンテストの `supportedModes` に適合しなければサーバー側で 403（FR-023）。詳細は [contracts/contest-api.md](./contracts/contest-api.md)。

---

## 8. FeatureFlags 拡張

| フィールド | 型 | 既定 | 説明 |
|---|---|---|---|
| `novelMode` | `boolean` | `true` | オフで小説 UI（新規作成の小説選択・フィルタ・小説エディタ）を非表示。データは保持（R-07）。 |

`config/features` ドキュメントで管理。`FeatureFlagsContext` / `firestoreService.FeatureFlags` / `DEFAULT_FLAGS` に追加。

---

## 9. ModeProfile（コードのみ・永続化なし）

`frontend/src/modes/` のレジストリ型。Firestore には保存しない。

```ts
interface ModeProfile {
  contentType: 'screenplay' | 'novel';
  label: string;                       // 「脚本」「小説」
  toolbar: ToolbarActionDef[];         // 挿入アクション定義
  structure: StructureDef;             // 構成パネル定義（起承転結 or 章一覧）
  prompts: PromptSet;                  // { synopsis, content, partial } × panelA/B
  exportPresets: ExportPresetDef[];    // モード対応プリセット
  defaults: { settings: EditorSettings; writingDirection?: 'vertical' | 'horizontal' };
}
```

`modes/index.ts` が `contentType → ModeProfile` を解決。`screenplay` プロファイルは既存ロジックの移設で挙動不変（R-08）。

---

## エンティティ関係（更新後）

```
Document(scripts/{id})  contentType ∈ {screenplay, novel}
  ├── (screenplay) content:string, characters[], characterText, contentCommentary
  └── (novel) novelContent{chapters[].sections[]}, novelSettings, worldbuilding, novelCommentary
  ├── versions/{versionId}            (既存、contentType を含めて保存)
  └── 1:N AdviceSession               (contentType を保持)

Contest(contests/{id})  supportedModes ∈ {screenplayOnly, novelOnly, both}
  └── entries/{entryId}  contentType  (ScriptSnapshot に contentType)
        └── evaluations/{uid}

Group(groups/{id})       (スキーマ変更なし)
  └── submissions/{id}   contentType  (ScriptSnapshot に contentType)
        └── corrections/{id}

config/features          + novelMode: boolean
formatPresets/{id}       + supportedModes: string[]
```
