---
description: "Task list for 小説モード追加（脚本／小説の分離）"
---

# Tasks: 小説モード追加（脚本／小説の分離）

**Input**: Design documents from `/specs/002-add-novel-mode/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: 振る舞い変更を伴うため、各ストーリーに契約／統合テストを含める。脚本リグレッション（SC-005/SC-009）防止のためスナップショットテストを必須とする。

**Organization**: タスクはユーザーストーリー単位（US1〜US5）で編成し、各ストーリーを独立に実装・テスト・デプロイ可能にする。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可（別ファイル・未完了タスクへの依存なし）
- **[Story]**: 所属ユーザーストーリー（US1〜US5）。Setup/Foundational/Polish はラベルなし
- 各タスクに正確なファイルパスを記載

## Path Conventions

- Web app モノレポ: `frontend/src/`, `frontend/tests/`, `functions/src/`, `functions/tests/`, リポジトリ直下 `firestore.rules`, `scripts/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: モードレジストリ層の骨組みと型定義

- [ ] T001 [P] `frontend/src/modes/types.ts` に `ModeProfile` / `ToolbarActionDef` / `StructureDef` / `PromptSet` / `ExportPresetDef` 型を定義（[data-model.md](./data-model.md) §9 準拠）
- [ ] T002 [P] `frontend/src/modes/index.ts` に `contentType → ModeProfile` 解決レジストリのスケルトン（未登録時は screenplay フォールバック）を作成
- [ ] T003 [P] `functions/src/advice/prompts/` ディレクトリを作成し、空の `screenplay.ts` / `novel.ts` をプレースホルダ追加

**Checkpoint**: modes レイヤの型・レジストリが import 可能

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 全ストーリーが依存する `contentType` 基盤・後方互換・脚本ロジック移設。**⚠️ このフェーズ完了まで US 実装は開始不可**

### contentType データ基盤（FR-001, FR-002, FR-005）

- [ ] T004 `frontend/src/lib/firebase/firestoreService.ts` の `FirestoreScript` に `contentType?: 'screenplay' | 'novel'` を追加し、`getScript`/`listScripts` の読み取りで未設定→`'screenplay'` フォールバックを実装
- [ ] T005 `frontend/src/lib/firebase/firestoreService.ts` の `createScript` に `contentType` 引数を追加（既定 `'screenplay'`、作成時のみ書込）
- [ ] T006 `frontend/src/stores/editorStore.ts` の `EditorState` に `contentType` を追加し、`createInitialEditorState` を `contentType` 受け取り対応に拡張
- [ ] T007 `firestore.rules` の `scripts/{id}` update ルールに `contentType` 不変性検証（既存値がある場合は変更不可）を追加（[contracts/migration.md](./contracts/migration.md) §ルール変更）

### 脚本ロジックの純粋移設（R-08・挙動不変）

- [ ] T008 [P] `frontend/src/modes/screenplay/toolbar.ts` に `ScriptToolbar` の `INSERT_TEMPLATES`（柱○/セリフ「」/ト書き）を移設
- [ ] T009 [P] `frontend/src/modes/screenplay/structure.ts` に `StructurePanel` の起承転結セグメント（25/35/20/20）を移設
- [ ] T010 [P] `frontend/src/modes/screenplay/prompts.ts` に `adviceService.ts` の `STRUCTURE_PROMPT`/`EMOTIONAL_PROMPT` を移設
- [ ] T011 [P] `frontend/src/modes/screenplay/exportProfile.ts` に `exportService.ts` の縦書き脚本グリッド設定を移設
- [ ] T012 [P] `frontend/src/modes/screenplay/defaults.ts` に脚本デフォルト（20字×20行×10枚）を移設
- [ ] T013 `functions/src/advice/prompts/screenplay.ts` に functions 側の脚本プロンプトを集約し、`providerGateway.ts` から参照する形にリファクタ
- [ ] T014 `frontend/src/modes/index.ts` に screenplay `ModeProfile` を登録（T008〜T012 を束ねる）

### モード対応の既存コンポーネント汎用化（FR-004）

- [ ] T015 `frontend/src/components/toolbar/ScriptToolbar.tsx` を `ModeProfile.toolbar` 参照に汎用化（脚本挙動は不変）
- [ ] T016 `frontend/src/components/structure/StructurePanel.tsx` を `ModeProfile.structure` 参照に汎用化
- [ ] T017 `frontend/src/services/adviceService.ts` を `contentType` 引数追加＋`modes/*/prompts` 参照に汎用化（フォールバック維持）
- [ ] T018 `frontend/src/services/exportService.ts` を `ModeProfile.exportProfile` 分岐に汎用化（脚本出力は不変）

### Feature Flag とロールバック（R-07, CA-005）

- [ ] T019 [P] `frontend/src/lib/firebase/firestoreService.ts` の `FeatureFlags` と `DEFAULT_FLAGS`、`frontend/src/contexts/FeatureFlagsContext.tsx` に `novelMode: boolean`（既定 true）を追加
- [ ] T020 [P] `functions/src/common/logging` を使う AI 呼び出しの `buildLogContext` に `contentType` フィールドを追加（[contracts/advice-api.md](./contracts/advice-api.md) 構造化ログ）

### 移設リグレッション保証テスト（R-08, SC-005）

- [ ] T021 [P] `frontend/tests/unit/modes/screenplay.snapshot.test.ts` に移設前後で脚本プロファイル（toolbar/structure/prompts/export/defaults）が同値であることのスナップショットテストを追加

**Checkpoint**: contentType 基盤が整い、脚本モードが modes レイヤ経由で従来どおり動作する

---

## Phase 3: User Story 1 - 小説作品を新規作成し章立てで執筆 (Priority: P1) 🎯 MVP

**Goal**: カタログから「小説」を選び、章・節構造で執筆・設定資料（人物/世界観/年表/用語集）を管理し、保存・再読み込みできる

**Independent Test**: 小説を新規作成→章・節を作って本文入力→設定資料 4 フィールドを入力→保存→再ロードで構造・設定資料が完全復元。既存脚本は脚本モードで開く（[quickstart.md](./quickstart.md) US1）

### Tests for User Story 1 ⚠️

- [ ] T022 [P] [US1] `frontend/tests/integration/novelCreateAndPersist.test.ts` に「小説作成→章節編集→保存→再ロードで一致」の統合テストを追加（先に FAIL させる）
- [ ] T023 [P] [US1] `frontend/tests/unit/modes/novelContent.test.ts` に章・節の追加／並び順／2階層制約のユニットテストを追加

### Implementation for User Story 1

- [ ] T024 [P] [US1] `frontend/src/lib/firebase/firestoreService.ts` の `FirestoreScript` に `novelContent` / `novelSettings` 型（[data-model.md](./data-model.md) §1-3）を追加し、`updateScript` の許可フィールドに含める
- [ ] T025 [P] [US1] `frontend/src/modes/novel/defaults.ts` に小説デフォルト（縦書き・20字×20行）を定義
- [ ] T026 [P] [US1] `frontend/src/modes/novel/toolbar.ts` に「章/節/会話/地の文」挿入アクションを定義（FR-006）
- [ ] T027 [P] [US1] `frontend/src/modes/novel/structure.ts` に章一覧（章タイトル＋字数・節数・進行率）定義を実装（FR-008）
- [ ] T028 [US1] `frontend/src/stores/editorStore.ts` に `novelContent` の章・節 CRUD（追加/削除/並び替え/本文更新）と進行率メトリクス（`recalculateGuideMetrics` 流用）を実装
- [ ] T029 [US1] `frontend/src/modes/index.ts` に novel `ModeProfile`（toolbar/structure/defaults）を登録
- [ ] T030 [P] [US1] `frontend/src/components/editor/ChapterList.tsx`（章一覧パネル）を新規作成
- [ ] T031 [US1] `frontend/src/components/toolbar/ScriptToolbar.tsx` が小説モード時に章ツールバーを表示するよう分岐（`ModeProfile.toolbar` 経由）
- [ ] T032 [US1] `frontend/src/pages/CatalogPage.tsx` の「新規作成」にモード選択モーダル（脚本/小説）を追加し、`createScript` に `contentType` を渡す（FR-003）
- [ ] T033 [US1] `frontend/src/pages/EditorPage.tsx` を `contentType` で UI 分岐（小説時は ChapterList＋章ツールバー、脚本時は従来 UI）
- [ ] T034 [US1] 小説エディタの縦書きレイアウト（`writing-mode: vertical-rl`）を `novelSettings.writingDirection` に連動させる（`frontend/src/styles/editor-v2.css` 活用、インラインスタイル禁止）
- [ ] T035 [US1] 章・節ゼロ／節なし章のエッジケース処理を `editorStore.ts` と `ChapterList.tsx` に実装

#### 設定資料 4 フィールド（FR-015・worldbuilding）

- [ ] T035a [US1] `frontend/src/lib/firebase/firestoreService.ts` の `FirestoreScript` に `worldbuilding` 型（`characters` / `worldview` / `timeline[]` / `glossary[]`、[data-model.md](./data-model.md) §4）を追加し、`updateScript` の許可フィールドに含める（全て任意項目）
- [ ] T035b [US1] `frontend/src/stores/editorStore.ts` に worldbuilding（人物/世界観/年表/用語集）の状態と CRUD（年表・用語集の行追加/削除）を追加
- [ ] T035c [P] [US1] `frontend/src/components/editor/WorldbuildingPanel.tsx` を新規作成（人物=`CharacterTable` 流用、世界観=自由記述、年表=「日時/イベント/関係人物」表、用語集=「用語/読み/説明」表、FR-015）
- [ ] T035d [US1] `frontend/src/pages/EditorPage.tsx` の小説モード分岐に `WorldbuildingPanel` を組み込む（脚本モードは従来の登場人物表を維持）
- [ ] T035e [P] [US1] `frontend/tests/unit/worldbuilding.test.ts` に 4 フィールドの CRUD・空許容・行追加削除のユニットテストを追加

**Checkpoint**: 小説 MVP が単独で動作・テスト可能（章立て＋設定資料、脚本は無影響）

---

## Phase 4: User Story 2 - 小説向け AI アドバイス 2 パネル (Priority: P2)

**Goal**: 編集者／文芸評論家ロールで小説向けアドバイスを 2 パネル取得、脚本プロンプトと混線しない

**Independent Test**: 小説でアドバイス→編集者/文芸評論家応答、脚本特有語の混入なし。脚本ドキュメントでは脚本プロンプト（[quickstart.md](./quickstart.md) US2）

### Tests for User Story 2 ⚠️

- [ ] T036 [P] [US2] `functions/tests/contract/adviceContentType.test.ts` に `/api/advice/generate` の `contentType` 分岐契約テスト（novel→novel テンプレ、省略→screenplay）を追加（[contracts/advice-api.md](./contracts/advice-api.md)）
- [ ] T037 [P] [US2] `functions/tests/unit/promptIsolation.test.ts` にプロンプト混線防止テスト（小説テンプレに柱/ト書き/ペラ非含有、脚本テンプレに地の文/章タイトル非含有、SC-007）を追加

### Implementation for User Story 2

- [ ] T038 [P] [US2] `frontend/src/modes/novel/prompts.ts` に小説プロンプト 3 系統（あらすじ/本文/部分選択）× パネルA=編集者 / パネルB=文芸評論家を実装（FR-011）
- [ ] T039 [P] [US2] `functions/src/advice/prompts/novel.ts` に functions 側の小説プロンプトを実装
- [ ] T040 [US2] `functions/src/advice/providerGateway.ts` の `AdviceRequest` に `contentType` を追加し、テンプレート選択ロジックを実装（FR-012）
- [ ] T041 [US2] `functions/src/advice/generateAdvice.ts` の入力に `contentType` を追加し、ゲートウェイへ伝搬＋ログに記録
- [ ] T042 [US2] `frontend/src/services/adviceService.ts` の `GenerateAdviceInput`／`generateAdvice` に `contentType` と `worldbuilding` 要約を追加し、functions/直接呼び出し双方の経路に伝搬
- [ ] T043 [US2] `frontend/src/lib/firebase/firestoreService.ts` に `novelCommentary`（editor/critic）保存フィールドを追加し、`contentType` ごとに分離保存
- [ ] T044 [US2] `frontend/src/components/advice/ContentCommentary.tsx`（または対応コンポーネント）を小説モード時に編集者/文芸評論家ラベルで表示するよう分岐
- [ ] T044a [US2] 小説プロンプトプリセット（スタンダード/文体重視/構成重視）を `frontend/src/modes/novel/prompts.ts` に定義し、既存プリセット基盤（`adviceStore` / プリセット保存・選択）で `contentType` ごとに分離して保存・選択できるようにする（FR-014）
- [ ] T044b [US2] `frontend/src/components/advice/PartialAdvice.tsx` を小説モードの部分選択プロンプト（FR-011「部分選択向け」）に対応させ、`adviceService` 経由で `contentType` を伝搬

**Checkpoint**: US1 + US2 が独立動作。AI 応答 < 10 秒（SC-003）

---

## Phase 5: User Story 3 - 小説向け原稿エクスポート (Priority: P2)

**Goal**: 章構造を保ち、縦書き原稿用紙/文庫横書き/Web小説プレーンで docx 出力。脚本エクスポートは不変

**Independent Test**: 章=見出し1/節=見出し2で docx 出力、プリセット切替が反映、脚本は従来出力（[quickstart.md](./quickstart.md) US3）

### Tests for User Story 3 ⚠️

- [ ] T045 [P] [US3] `frontend/tests/unit/novelExport.test.ts` に章=HEADING_1／節=HEADING_2 マッピング、節なし章の見出し2省略、章ゼロ時の見出し非出力（Edge Case）を検証するテストを追加
- [ ] T046 [P] [US3] `frontend/tests/unit/screenplayExportRegression.test.ts` に既存脚本エクスポート出力が不変であることの回帰テストを追加（FR-018, SC-005）

### Implementation for User Story 3

- [ ] T047 [P] [US3] `frontend/src/modes/novel/exportProfile.ts` に 3 プリセット（縦書き原稿用紙/文庫横書き/Web小説プレーン）を `docx` 構成で実装（FR-016, FR-017）
- [ ] T048 [US3] `frontend/src/services/exportService.ts` に小説 docx 生成（章=HEADING_1/節=HEADING_2、段落字下げ、`writingDirection` 連動の `PageTextDirectionType`）を実装
- [ ] T049 [P] [US3] `frontend/src/types/formatPreset.ts` の `FormatPreset` に `supportedModes` を追加（未設定→`['screenplay']`）
- [ ] T050 [US3] `frontend/src/components/export/FormatPresetSelector.tsx` を `supportedModes` でフィルタし、非互換プリセット選択時に警告して中止（Edge Case）
- [ ] T051 [US3] `frontend/src/components/export/ExportPreview.tsx` を小説モードの章節プレビュー対応に分岐

**Checkpoint**: US1〜US3 が独立動作。docx 階層表示 ≥95%（SC-004）

---

## Phase 6: User Story 4 - モード切替 UI とカタログフィルタ (Priority: P3)

**Goal**: カタログで「すべて/脚本/小説」フィルタ、モードバッジ、総称「マイ作品」

**Independent Test**: 脚本1件・小説1件でフィルタ切替が機能、3クリック以下で到達（[quickstart.md](./quickstart.md) US4）

### Tests for User Story 4 ⚠️

- [ ] T052 [P] [US4] `frontend/tests/integration/catalogFilter.test.ts` にフィルタ切替（すべて/脚本/小説）と件数連動の統合テストを追加

### Implementation for User Story 4

- [ ] T053 [P] [US4] `frontend/src/components/catalog/ModeBadge.tsx`（脚本/小説バッジ）を新規作成（FR-020）
- [ ] T054 [US4] `frontend/src/pages/CatalogPage.tsx` に「すべて/脚本/小説」フィルタタブ（既定すべて）と件数表示、各カードへの `ModeBadge` を追加（FR-019）
- [ ] T055 [P] [US4] UI 総称を「マイ作品」に統一（`CatalogPage.tsx`、ナビ/`Layout`、empty state、通知メッセージ）し、モード区別はバッジに寄せる（FR-021）
- [ ] T056 [US4] T032 のモード選択モーダルを共通コンポーネント化して再利用（重複排除）

**Checkpoint**: US1〜US4 が独立動作。混在ユーザー体験成立（SC-006）

---

## Phase 7: User Story 5 - コンテスト・グループに小説提出 (Priority: P4)

**Goal**: `supportedModes`／`contentType` 検証で小説の応募・提出・講評を実現、既存脚本フロー互換

**Independent Test**: 小説対応コンテストへ応募→講評者が章一覧＋小説プロンプトで閲覧、脚本のみへ小説応募は 403（[quickstart.md](./quickstart.md) US5）

### Tests for User Story 5 ⚠️

- [ ] T057 [P] [US5] `functions/tests/contract/contestContentType.test.ts` に応募時 `contentType` 整合性検証（不整合→403 `CONTENT_TYPE_NOT_ALLOWED`）の契約テストを追加（[contracts/contest-api.md](./contracts/contest-api.md)）
- [ ] T058 [P] [US5] `frontend/tests/integration/screenplayContestRegression.test.ts` に既存脚本コンテスト／グループ応募・閲覧・添削の回帰テストを追加（US5-5, SC-009）

### Implementation for User Story 5

- [ ] T059 [P] [US5] `frontend/src/lib/firebase/firestoreService.ts` の `Contest` に `supportedModes`、`ContestEntry`/`GroupSubmission`/`ScriptSnapshot` に `contentType` を追加（[data-model.md](./data-model.md) §7）
- [ ] T060 [US5] `functions/src/documents/`（または応募 API）に `POST /api/contests/{contestId}/entries` の `contentType` 整合性検証（403）を実装（FR-023, CA-003）
- [ ] T061 [US5] `frontend/src/pages/ContestCreatePage.tsx` に「対応モード」（screenplayOnly/novelOnly/both、既定 screenplayOnly）選択を追加（FR-022）
- [ ] T062 [US5] `frontend/src/pages/ContestEntryPage.tsx` の応募候補を `supportedModes` でフィルタし、`createContestEntry` に `contentType` を付与
- [ ] T063 [US5] `frontend/src/pages/GroupDetailPage.tsx` の作品一覧にモードバッジと「すべて/脚本/小説」フィルタを追加（FR-024）
- [ ] T064 [US5] `frontend/src/pages/SubmissionViewPage.tsx` と `frontend/src/pages/CorrectionPage.tsx` を `contentType` で分岐（小説時は章一覧＋小説プロンプト、脚本時は既存挙動、FR-025）

**Checkpoint**: 全ストーリーが独立動作。小説応募 ≥95%（SC-008）、脚本回帰ゼロ（SC-009）

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: マイグレーション・横断品質・ドキュメント

- [ ] T065 `scripts/migrate-content-type.ts` を実装（firebase-admin、冪等、`--dry-run`、writeBatch 500件分割。Stage1: scripts→contentType='screenplay'、Stage2: contests→supportedModes='screenplayOnly'＋entries/submissions→contentType。[contracts/migration.md](./contracts/migration.md)）
- [ ] T066 [P] `specs/001-build-scenario-writing/release-rollback.md` にマイグレーションのバックアップ取得・ロールバック手順・`novelMode` フラグ即停止を追記（CA-005）
- [ ] T067 [P] `README.md` / `CHANGELOG.md` に小説モードの機能と使い方を追記（docs-sync）
- [ ] T068 [P] `frontend/tests/unit/` に章一覧進行率・worldbuilding 4 フィールド・モードバッジのユニットテストを追加
- [ ] T069 `npm run ci:check`（lint + format + typecheck + unit + integration）を全パスさせる
- [ ] T070 [quickstart.md](./quickstart.md) の US1〜US5 とマイグレーション検証を手動実行し、SC-001〜SC-009 を確認

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし、即開始可
- **Foundational (Phase 2)**: Setup 完了に依存 — **全 US をブロック**
- **User Stories (Phase 3-7)**: Foundational 完了後に開始。優先度順 P1→P2→P2→P3→P4、またはチームで並列
- **Polish (Phase 8)**: 対象 US 完了に依存（特に T065 マイグレーションは US5 完了後の実行が安全）

### User Story Dependencies

- **US1 (P1)**: Foundational のみに依存。他ストーリー非依存（MVP）
- **US2 (P2)**: Foundational に依存。US1 の小説ドキュメントがあると検証しやすいが、独立テスト可能
- **US3 (P2)**: Foundational に依存。US1 の章構造を使うが、サンプルデータで独立テスト可能
- **US4 (P3)**: Foundational に依存。US1 の作成フロー（T032）を共通化（T056）するが独立テスト可能
- **US5 (P4)**: Foundational に依存。US1〜US3 のモード分岐を再利用するが、既存コンテスト基盤で独立リリース可能

### Within Each User Story

- テストを先に書いて FAIL させる → モデル/型 → store/service → コンポーネント/ページ → 統合
- 同一ファイルを触るタスクは直列（[P] なし）

### Parallel Opportunities

- Phase 1 の T001-T003 は全て [P]
- Phase 2 の脚本移設 T008-T012 は [P]（別ファイル）。T021 も [P]
- Foundational 完了後、US1〜US5 を別担当で並列可
- 各 US 内のテスト（[P]）・型/モデル（[P]）は並列可

---

## Parallel Example: User Story 1

```bash
# US1 のテストを並列起動:
Task: "frontend/tests/integration/novelCreateAndPersist.test.ts の統合テスト (T022)"
Task: "frontend/tests/unit/modes/novelContent.test.ts のユニットテスト (T023)"

# US1 の型/モード定義を並列起動:
Task: "FirestoreScript に novelContent/novelSettings 追加 (T024)"
Task: "modes/novel/defaults.ts (T025)"
Task: "modes/novel/toolbar.ts (T026)"
Task: "modes/novel/structure.ts (T027)"
```

---

## Implementation Strategy

### MVP First (User Story 1 のみ)

1. Phase 1: Setup を完了
2. Phase 2: Foundational を完了（**全ストーリーをブロック**。脚本リグレッション T021 を必ず緑に）
3. Phase 3: User Story 1 を完了
4. **STOP & VALIDATE**: 小説作成→保存→再ロードを独立検証
5. 準備できたらデプロイ／デモ（MVP）

### Incremental Delivery

1. Setup + Foundational → 基盤完成
2. US1（P1） → 独立テスト → デプロイ（MVP）
3. US2（P2 AI）＋ US3（P2 エクスポート） → 各独立テスト → デプロイ
4. US4（P3 UI） → 独立テスト → デプロイ
5. US5（P4 コンテスト/グループ） → 独立テスト → デプロイ
6. Polish（T065 マイグレーション本実行はバックアップ取得後）

### Parallel Team Strategy

1. Setup + Foundational をチームで完了
2. 完了後: Dev A=US1、Dev B=US2、Dev C=US3、Dev D=US4/US5
3. 各ストーリーは独立に統合

---

## Notes

- [P] = 別ファイル・依存なし。同一ファイル（例: `firestoreService.ts`、`editorStore.ts`、`exportService.ts`、`CatalogPage.tsx`、`EditorPage.tsx`）を触る複数タスクは直列。特に T024/T035a/T043（`firestoreService.ts`）、T028/T035b（`editorStore.ts`）、T033/T035d（`EditorPage.tsx`）は同一ファイルのため直列実行
- [Story] ラベルでトレーサビリティを確保
- 脚本リグレッション禁止（SC-005/SC-009）: Phase 2 の移設は同値変換に限定し、T021/T046/T058 の回帰テストを常時緑に保つ
- 構造テンプレート（三幕/序破急、FR-008 の P2 任意機能）は本フェーズ対象外。デフォルトの章一覧のみ実装する
- 各タスク／論理グループ後にコミット
- `contentType` フォールバック・`novelMode` フラグにより、マイグレーション未完でも安全に段階リリース可能
