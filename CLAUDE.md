# CLAUDE.md — Scenario Lab

> Claude Code がこのリポジトリで作業する際に参照するプロジェクトコンテキスト。

---

## プロジェクト概要

**Scenario Lab** は、脚本執筆に特化した MVP Web アプリケーション。
縦書きエディタ、安全なドキュメント保存、デュアル AI フィードバックを主要機能とする。

- **リポジトリ**: `scenario-lab` (npm workspaces モノレポ)
- **ホスティング**: Firebase Hosting (`scenariolab-studio`)
- **Firebase Project**: `scenario-lab-studio`
- **公開 URL**: https://scenariolab-studio.web.app

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Frontend | React 19 + TypeScript + Vite 7 |
| Styling | Vanilla CSS (カスタムプロパティベース) |
| Backend | Firebase Functions (Node 22, CommonJS) |
| Auth | Firebase Authentication (Google Sign-In) |
| DB | Cloud Firestore |
| AI | Google Generative AI SDK + Anthropic SDK (フロントエンド直接呼び出し) |
| Testing | Vitest + Testing Library |
| Lint/Format | ESLint + Prettier |

---

## ディレクトリ構成

```
ScenarioLab/
├── frontend/                 # @scenario-lab/frontend (Vite + React SPA)
│   ├── src/
│   │   ├── App.tsx           # ルーティング + レイアウト
│   │   ├── main.tsx          # エントリポイント
│   │   ├── components/       # 機能別コンポーネント
│   │   │   ├── advice/       # AI アドバイスパネル
│   │   │   ├── comments/     # コメント機能
│   │   │   ├── common/       # 共通 UI 部品
│   │   │   ├── corrections/  # 添削機能
│   │   │   ├── editor/       # 縦書きエディタ
│   │   │   ├── export/       # エクスポート
│   │   │   ├── groups/       # グループ機能
│   │   │   ├── structure/    # 構成ガイド
│   │   │   ├── toolbar/      # 書式ツールバー
│   │   │   └── ui/           # 汎用 UI コンポーネント
│   │   ├── contexts/         # React Context (Auth, FeatureFlags)
│   │   ├── hooks/            # カスタムフック
│   │   ├── pages/            # ルート対応ページコンポーネント
│   │   ├── services/         # API・ビジネスロジック
│   │   ├── stores/           # 状態管理 (editorStore, adviceStore)
│   │   ├── styles/           # CSS デザインシステム
│   │   │   ├── tokens.css    # カラー・スペーシング・タイポ
│   │   │   ├── base.css      # リセット・グローバルスタイル
│   │   │   ├── components.css # 汎用コンポーネントクラス
│   │   │   └── editor-v2.css # エディタ専用スタイル
│   │   ├── types/            # TypeScript 型定義
│   │   └── utils/            # ユーティリティ関数
│   └── tests/
│       ├── unit/
│       └── integration/
├── functions/                # @scenario-lab/functions (Firebase Functions)
│   ├── src/
│   │   ├── index.ts          # Functions エントリ（エクスポート）
│   │   ├── firebase.ts       # Admin SDK 初期化
│   │   ├── server.ts         # ローカル dev サーバー
│   │   ├── advice/           # AI アドバイス関連
│   │   ├── common/           # 共通ユーティリティ
│   │   └── documents/        # ドキュメント CRUD
│   └── tests/
├── specs/                    # 機能仕様書 (speckit 管理)
│   └── 001-build-scenario-writing/
├── .specify/                 # speckit テンプレート・メモリ
│   ├── memory/
│   │   ├── constitution.md   # プロジェクト憲章
│   │   └── design-rules.md   # デザインルール
│   └── templates/
├── .claude/                  # Claude Code 設定
│   └── commands/             # カスタムスラッシュコマンド
├── firestore.rules           # Firestore セキュリティルール
├── firestore.indexes.json    # Firestore インデックス定義
├── firebase.json             # Firebase 設定
└── tsconfig.base.json        # 共通 TypeScript 設定
```

---

## 開発コマンド

```bash
# セットアップ
npm install

# 開発サーバー
npm run dev:frontend          # Vite dev server (frontend)
npm run dev:functions          # tsx dev server (functions)

# 品質チェック
npm run lint                   # ESLint (全 workspace)
npm run format:check           # Prettier チェック
npm run typecheck              # TypeScript 型チェック
npm run test:unit              # ユニットテスト
npm run test:integration       # インテグレーションテスト
npm run ci:check               # lint + format + typecheck + test (CI 一括)

# ビルド
npm run build                  # frontend + functions
npm run build:frontend
npm run build:functions

# デプロイ
npm run deploy:precheck        # プリフライトチェック
npm run deploy:firebase        # Firebase 全体デプロイ
npm run deploy:hosting         # Hosting のみ
npm run deploy:functions       # Functions のみ (firebase deploy --only functions)
```

---

## コーディング規約

### TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`
- ターゲット: ES2022, モジュール解決: Bundler
- Frontend は ESM (`"type": "module"`)、Functions は CommonJS (`"type": "commonjs"`)
- 型定義は `frontend/src/types/` に集約

### CSS / スタイリング

- **Vanilla CSS のみ** — Tailwind 等の CSS フレームワーク不使用
- カスタムプロパティ (`tokens.css`) でカラー・スペーシング・タイポを管理
- インラインスタイル **原則禁止** — CSS クラスを使う
- コンポーネント共通クラス: `.section-container`, `.btn-primary`, `.btn-danger`, `.flex-row`, `.flex-col`, `.grid-2col`
- 配色: **モノトーン基調 + 抑制された青アクセント**
- デザイン参照: 東大 Web サイトの「簡潔・余白・タイポ中心・節度あるアクセント」

### 縦書きエディタ

- `writing-mode: vertical-rl; text-orientation: upright` で縦書き
- CSS クラス: `.vertical-editor`
- 最小高さ: 420px, 行間: 1.8
- 全デバイスで横スクロール可能

### レスポンシブ

- Desktop-first 設計 (主要ターゲット: 1024px+)
- ブレイクポイント: `--breakpoint-tablet: 768px`, `--breakpoint-desktop: 1024px`
- 768px 以下で 2 カラム → 1 カラムスタック

### 用語マッピング

| 日本語 | コード識別子 |
|--------|-------------|
| 柱（場面見出し） | `scene` |
| ト書き | `action` |
| セリフ | `dialogue` |
| 登場人物表 | `characterTable` |
| 構成ガイド | `structurePanel` |
| あらすじ | `synopsis` |
| 脚本 | `script` / `document` |
| 縦書き | `verticalEditor` |
| 部分アドバイス | `partialAdvice` |
| 差分比較 | `diffView` |

---

## アーキテクチャ原則

### データフロー

```
User → React Component → Store/Service → Firebase SDK → Firestore/Functions
                                    ↘ AI SDK (Gemini/Claude) → advice response
```

### Firestore コレクション

| コレクション | 用途 | アクセス制御 |
|-------------|------|-------------|
| `users/{uid}` | ユーザープロフィール | 本人 or admin |
| `projects/{projectId}` | プロジェクト | owner or admin |
| `scripts/{scriptId}` | 脚本データ | owner or admin |
| `scripts/{scriptId}/versions/{versionId}` | バージョン履歴 | 親 script の owner |
| `groups/{groupId}` | グループ | 認証ユーザー |
| `comments/{commentId}` | コメント | 認証ユーザー |
| `contests/{contestId}` | コンテスト | 認証ユーザー |
| `formatPresets/{presetId}` | 書式プリセット | 認証ユーザー |
| `prompts/{logicId}` | プロンプト設定 | 本人 or admin |
| `config/{docId}` | システム設定 | admin のみ書き込み |

### セキュリティ

- シークレットはクライアントコードに含めない
- 環境変数: `.env` / `.env.local` (gitignore 対象)
- Firestore ルールでユーザーごとのデータ分離を強制
- AI プロバイダーの本番認証情報はサーバーサイド経由

---

## テスト

- テストフレームワーク: **Vitest**
- フロントエンドテスト: `frontend/tests/unit/`, `frontend/tests/integration/`
- バックエンドテスト: `functions/tests/unit/`, `functions/tests/integration/`
- テスト環境: `frontend/.env.test` で本番 API 呼び出しを防止
- テスト実行: `npm run test:unit` (ユニット), `npm run test:integration` (統合)
- `--passWithNoTests` フラグで空テストディレクトリを許容

---

## speckit ワークフロー

このプロジェクトは **speckit** で仕様→計画→タスク→実装のワークフローを管理:

1. **`/specify`** — 自然言語から機能仕様書を生成 → `specs/NNN-xxx/spec.md`
2. **`/plan`** — 仕様から実装計画を生成 → `plan.md`, `data-model.md`, `contracts/`, `research.md`
3. **`/tasks`** — 計画からタスク分解 → `tasks.md`
4. **`/implement`** — タスクに従って実装実行

### 憲章 (Constitution) の 5 原則

1. **Spec-Driven Delivery** — 仕様承認なしに実装しない
2. **Script Format Fidelity** — 脚本フォーマットの忠実性を保証
3. **Secure AI and Data Boundaries** — 秘密情報とデータ境界の安全性
4. **Testable Incremental Quality** — テスト可能な段階的品質
5. **Observable and Reversible Change** — 監視可能で可逆的な変更

---

## 環境変数

### frontend/.env

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=scenario-lab-studio
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FUNCTIONS_BASE_URL=        # ローカル: http://localhost:3001, 本番: Functions URL
```

### functions/.env

```
DOCUMENT_STORE_BACKEND=firestore   # "firestore" or "memory"
GOOGLE_GENERATIVE_AI_API_KEY=
ANTHROPIC_API_KEY=
```

---

## よくあるタスクと注意点

### 新しいページを追加する

1. `frontend/src/pages/XxxPage.tsx` を作成
2. `frontend/src/App.tsx` にルートを追加
3. CSS は `frontend/src/styles/` の既存トークン・コンポーネントクラスを使用

### 新しい Firestore コレクションを追加する

1. `firestore.rules` にルールを追加
2. 必要なら `firestore.indexes.json` にインデックスを追加
3. フロントエンドの Service 層でアクセスロジックを実装

### Functions エンドポイントを追加する

1. `functions/src/` に機能ディレクトリを作成
2. `functions/src/index.ts` でエクスポート
3. フロントエンドの `functionsApi.ts` から呼び出し

### CI チェックを通す

変更をコミットする前に必ず `npm run ci:check` を実行し、以下が全パスすることを確認:
- ESLint エラーなし
- Prettier フォーマット準拠
- TypeScript 型エラーなし
- ユニット・統合テスト全パス

---

## 避けるべきこと

- ❌ Tailwind CSS やその他の CSS フレームワークの導入
- ❌ インラインスタイルの使用 (`style={{}}`)
- ❌ クライアントコードへの API キー直書き
- ❌ `any` 型の使用（strict モード違反）
- ❌ 仕様なしの機能実装（Spec-Driven Delivery 原則違反）
- ❌ テストなしの機能追加（Testable Incremental Quality 原則違反）
- ❌ `node_modules/` や `.env` のコミット

## Active Technologies
- TypeScript 5.9（frontend ESM / functions CommonJS）, Node 22（functions ランタイム）, Node ≥20（リポジトリ） + React 19.1, Vite 7.1, react-router-dom 7.13, `docx` 9.6（エクスポート）, firebase（client）, firebase-admin 12.7 / firebase-functions 7.0（functions）, `@google/generative-ai`（フロント直接呼び出し・プロトタイプ経路） (002-add-novel-mode)
- Cloud Firestore（`scripts` コレクション拡張、`contests` 拡張、ドキュメント内ネスト構造で章・節を表現） (002-add-novel-mode)

## Recent Changes
- 002-add-novel-mode: Added TypeScript 5.9（frontend ESM / functions CommonJS）, Node 22（functions ランタイム）, Node ≥20（リポジトリ） + React 19.1, Vite 7.1, react-router-dom 7.13, `docx` 9.6（エクスポート）, firebase（client）, firebase-admin 12.7 / firebase-functions 7.0（functions）, `@google/generative-ai`（フロント直接呼び出し・プロトタイプ経路）
