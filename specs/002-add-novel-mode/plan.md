# Implementation Plan: 小説モード追加（脚本／小説の分離）

**Branch**: `002-add-novel-mode` | **Date**: 2026-06-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-add-novel-mode/spec.md`

## Summary

既存の脚本特化サービス Scenario Lab に、同一アプリ内で切り替え可能な **小説モード** を追加する。全ドキュメントに不可逆の `contentType: 'screenplay' | 'novel'` を持たせ、`frontend/src/modes/{screenplay,novel}/` という **モードレジストリ層** にツールバー定義・構成パネル定義・AI プロンプト・エクスポートプロファイル・デフォルト設定を集約する。既存コンポーネントはモードプロファイルを参照する形に薄くリファクタし、脚本モードの挙動は完全互換を維持する。コンテスト／グループは `supportedModes` を加えて小説作品の応募・講評まで対応する（P4）。

技術アプローチ: モノレポ・1 Firebase プロジェクト・1 Hosting を維持（spec の A 案）。新規バックエンド依存は追加せず、既存の `functions/src/advice` プロバイダゲートウェイに `contentType` を流し、プロンプトテンプレートをモード別ファイルに分離する。Firestore は `scripts` コレクションを温存し、`contentType` フィールド追加＋バッチマイグレーションで後方互換を確保する。

## Technical Context

**Language/Version**: TypeScript 5.9（frontend ESM / functions CommonJS）, Node 22（functions ランタイム）, Node ≥20（リポジトリ）
**Primary Dependencies**: React 19.1, Vite 7.1, react-router-dom 7.13, `docx` 9.6（エクスポート）, firebase（client）, firebase-admin 12.7 / firebase-functions 7.0（functions）, `@google/generative-ai`（フロント直接呼び出し・プロトタイプ経路）
**Storage**: Cloud Firestore（`scripts` コレクション拡張、`contests` 拡張、ドキュメント内ネスト構造で章・節を表現）
**Testing**: Vitest 3.2 + Testing Library（`frontend/tests/{unit,integration}`, `functions/tests/{unit,integration}`）
**Target Platform**: Web（Desktop-first 1024px+、タブレット対応）
**Project Type**: web（`frontend` SPA + `functions` バックエンドの npm workspaces モノレポ）
**Performance Goals**: 小説 2 パネル AI アドバイス応答 < 10 秒（SC-003）、保存成功率 ≥ 95%（SC-002）、docx 階層表示成功率 ≥ 95%（SC-004）
**Constraints**: 縦書きフォーマット忠実性（Vanilla CSS のみ、インラインスタイル禁止）、`contentType` 後方互換（未設定→`'screenplay'`）、脚本モードのリグレッション禁止（SC-005/SC-009 で 30 日ゼロ件）、シークレットはサーバーサイド境界経由
**Scale/Scope**: 既存ユーザー規模（小〜中）、`scripts` / `contests` の 2 段階バッチマイグレーション、新規 5 ユーザーストーリー（P1〜P4）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] `Spec-Driven Delivery`: spec は独立テスト可能な 5 ユーザーストーリー（P1〜P4）、FR-001〜FR-025、測定可能な SC-001〜SC-009 を含む。Open Questions は Session 2026-06-13 で全 7 件解決済み。
- [x] `Script Format Fidelity`: 縦書き・章節階層・原稿用紙グリッドの整形を US1-2 / US3-1 / US3-2 の受入シナリオで検証。既存脚本エクスポートは無変更（FR-018）で、リグレッション検証を US5-5 / SC-005 / SC-009 に定義。
- [x] `Secure AI and Data Boundaries`: 小説プロンプトも functions 経由（API キーはサーバー側、FR-010/FR-012）。Firestore ルールは `ownerId` ベースを維持しつつ `contentType` の不変性検証を追加（FR-005/CA-003）。コンテスト応募は `contentType` 整合性をサーバー側で 403 検証（FR-023、UI バイパス二重防御）。
- [x] `Testable Incremental Quality`: 各ストーリーを P1→P2→P3→P4 の独立 PR としてリリース可能。各層に Vitest（unit/integration/contract）を割り当て。
- [x] `Observable and Reversible Change`: AI 呼び出しに `contentType` 構造化ログ（既存 `buildLogContext` 拡張）。2 段階マイグレーションはバックアップ取得＋ロールバック手順を `release-rollback` に明記。小説 UI は `FeatureFlagsContext` に `novelMode` フラグを追加して即時オフ可能。

→ 全ゲート PASS。Complexity Tracking への記載事項なし。

## Project Structure

### Documentation (this feature)

```text
specs/002-add-novel-mode/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── advice-api.md         # /api/advice/generate に contentType 追加
│   ├── contest-api.md        # 応募時 contentType 整合性検証 (403)
│   └── migration.md          # scripts/contests バッチマイグレーション契約
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

新規追加する **modes レイヤ** を中心に、既存ディレクトリへは最小限の差分で介入する。

```text
frontend/src/
├── modes/                          # 🆕 モードレジストリ層（本機能の中核）
│   ├── index.ts                    # ModeProfile レジストリ: contentType → profile 解決
│   ├── types.ts                    # ModeProfile / ToolbarAction / StructureDef 型
│   ├── screenplay/                 # 既存脚本ロジックを移植（挙動は不変）
│   │   ├── toolbar.ts              # ← ScriptToolbar の INSERT_TEMPLATES を移設
│   │   ├── structure.ts            # ← StructurePanel の起承転結セグメント
│   │   ├── prompts.ts              # ← STRUCTURE_PROMPT / EMOTIONAL_PROMPT
│   │   ├── exportProfile.ts        # ← exportService の縦書き脚本グリッド
│   │   └── defaults.ts             # ← 20字×20行×10枚
│   └── novel/                      # 🆕 小説モード
│       ├── toolbar.ts              # 章/節/会話/地の文の挿入アクション
│       ├── structure.ts            # 章一覧（章タイトル＋字数・節数・進行率）
│       ├── prompts.ts              # 編集者/文芸評論家プロンプト
│       ├── exportProfile.ts        # 縦書き原稿用紙/文庫横書き/Web小説プレーン
│       └── defaults.ts             # 縦書き・20字×20行
├── components/
│   ├── toolbar/ScriptToolbar.tsx   # ✏ ModeProfile.toolbar を参照する汎用化
│   ├── structure/StructurePanel.tsx # ✏ ModeProfile.structure を参照
│   ├── editor/
│   │   ├── ChapterList.tsx         # 🆕 小説の章一覧パネル
│   │   └── WorldbuildingPanel.tsx  # 🆕 人物/世界観/年表/用語集の4フィールド
│   └── catalog/ModeBadge.tsx       # 🆕 脚本/小説バッジ + NewDocModal
├── lib/firebase/firestoreService.ts # ✏ FirestoreScript に contentType / novel* 追加
├── services/
│   ├── adviceService.ts            # ✏ contentType を引数に、modes/*/prompts を使用
│   └── exportService.ts            # ✏ ModeProfile.exportProfile で分岐
├── stores/editorStore.ts           # ✏ EditorState に contentType / novel 構造
├── contexts/FeatureFlagsContext.tsx # ✏ novelMode フラグ追加
└── pages/
    ├── CatalogPage.tsx             # ✏ すべて/脚本/小説 フィルタ + モード選択
    ├── EditorPage.tsx              # ✏ contentType で UI 分岐
    ├── ContestCreatePage.tsx       # ✏ supportedModes 選択
    ├── ContestEntryPage.tsx        # ✏ contentType フィルタ
    └── SubmissionViewPage.tsx      # ✏ 小説章一覧 + 小説プロンプト

functions/src/
├── advice/
│   ├── generateAdvice.ts           # ✏ contentType を受領しゲートウェイへ
│   ├── providerGateway.ts          # ✏ contentType でプロンプト選択
│   └── prompts/                    # 🆕 サーバー側プロンプト分離
│       ├── screenplay.ts
│       └── novel.ts
└── documents/                      # ✏ contentType 検証 + コンテスト応募整合性

firestore.rules                     # ✏ scripts に contentType 不変性、contests に supportedModes
scripts/                            # 🆕 マイグレーション CLI（migrate-content-type.ts）
```

**Structure Decision**: 既存の `frontend` + `functions` web モノレポ構造を維持。新機能の差分を **`frontend/src/modes/` レジストリ層**に集約し、既存コンポーネントは「モードプロファイルを読むだけ」に薄くリファクタする。これにより (1) 脚本ロジックの挙動を変えずに小説ロジックを並置でき、(2) 将来 `frontend-novel/` や `apps/novel-lab/` へ切り出す際は `modes/novel/` をそのまま移送できる（spec の昇格パス）。modes レイヤは React/Firestore への直接依存を持たず、純粋な定義（テンプレート文字列・数値・関数）に限定する設計指針とする。

## Complexity Tracking

> Constitution Check は全ゲート PASS のため記載なし。

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| （なし） | — | — |
