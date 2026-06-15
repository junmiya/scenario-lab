# Phase 0 Research: 小説モード追加

**Feature**: `002-add-novel-mode` | **Date**: 2026-06-13

spec の Clarifications（Session 2026-06-13）で全 Open Questions が解決済みのため、本ファイルは「確定済み仕様の技術的裏付け」と「実装方式の選択」を記録する。NEEDS CLARIFICATION 残件なし。

---

## R-01: モード分離アーキテクチャ

- **Decision**: `frontend/src/modes/{screenplay,novel}/` レジストリ層を新設し、`contentType` フラグでプロファイルを解決する（spec A 案）。
- **Rationale**: 既存 `scripts` コレクションと脚本コンポーネントを温存でき、初期実装コストが最小。modes レイヤを純粋定義に限定すれば、将来 `frontend-novel/`（C 案）や `apps/novel-lab/`（B 案）への切り出しが容易。フォルダ構成比較（A=57 / B=53 / C=53）で A が最良。
- **Alternatives considered**:
  - B 案（別アプリ完全分離）: URL/ブランド独立だが共通基盤のパッケージ抽出コストが最大。小説 MVP 検証前には過剰。
  - C 案（モノレポ内フロント分割）: バランス型だが frontend 2 つ分の CI/ビルド複雑化。現段階では不要。

## R-02: `contentType` の後方互換とマイグレーション

- **Decision**: `scripts/{id}` に `contentType?: 'screenplay' | 'novel'` を追加。**読み取り時に未設定なら `'screenplay'` とみなす**（フェイルセーフ）。並行して 2 段階バッチマイグレーション（`scripts` → `contentType:'screenplay'`、`contests` → `supportedModes:'screenplayOnly'`）を実施。
- **Rationale**: 既存ドキュメントを壊さずに段階移行できる。読み取りフォールバックがあるため、マイグレーション完了前でも UI は正しく動作する（マイグレーションは「正規化」であって「機能の前提」ではない）。
- **Alternatives considered**:
  - 全件を `documents` コレクションへ改名移行: 長期的に綺麗だが移行リスク・全 service 層改修が大きく、本フェーズでは不採用（spec の移行方針「既存=脚本のまま維持」に従う）。
  - フィールド追加なしで推論: タイトルや内容からモード推測は不確実。明示フィールドが必須。

## R-03: 小説本文の章・節データ構造

- **Decision**: 章・節は **ドキュメント内ネスト**（`scripts/{id}` の `novelContent.chapters[]`）として表現。`chapters: Array<{ id, title, order, body, sections?: Array<{ id, title, order, body }> }>`。2 階層固定（章＞節）、3 階層以上禁止。
- **Rationale**: 既存 `content: string` のシンプルさを保ちつつ、章一覧パネル・docx 見出しマッピングに必要な構造を最小限で持てる。サブコレクション化すると保存・バージョン履歴・スナップショット（提出/応募）が複雑化するため回避。MAX_VERSIONS=5 の既存バージョン履歴ともネスト構造で互換。
- **Alternatives considered**:
  - `scripts/{id}/chapters/{chapterId}` サブコレクション: 大長編にはスケールするが、提出スナップショット・差分比較・1 ドキュメント保存の単純性を損なう。任意階層も spec で却下済み（Q6: 2 階層固定）。
  - Markdown 見出し記法を `content` に埋め込む: パースが脆くなり、章一覧の進行率計算が不安定。構造化配列を採用。

## R-04: AI プロンプトのモード分離

- **Decision**: プロンプトを `frontend/src/modes/{screenplay,novel}/prompts.ts`（プロトタイプ直接呼び出し経路）と `functions/src/advice/prompts/{screenplay,novel}.ts`（本番サーバー経路）に二重に分離。`contentType` をリクエストパラメータ（`/api/advice/generate`）に追加し、`providerGateway` がテンプレートを選択。小説デフォルトは パネルA=編集者 / パネルB=文芸評論家。
- **Rationale**: 既存実装は frontend 直接（`callGemini`）と functions 経由（`generateDualAdvice`）の二経路があるため、両方でプロンプトを差し替えないと混線（SC-007）が起きる。サーバー側で `contentType` を権威的に扱い、UI を信用しすぎない。
- **Alternatives considered**:
  - 単一プロンプトに「モード」変数を注入: テンプレートが肥大化し、脚本特有語の混入チェックが困難。ファイル分離が監査性・テスト容易性で勝る。
  - クライアントのみでプロンプト切替: functions 経路が脚本プロンプトのままになりリグレッション。両経路対応が必須。

## R-05: 小説エクスポート（docx）プロファイル

- **Decision**: 既存 `docx` 9.6 を流用し、`modes/novel/exportProfile.ts` に 3 プリセット（縦書き原稿用紙 / 文庫横書き / Web 小説プレーン）を定義。章=`HeadingLevel.HEADING_1`、節=`HEADING_2`、本文=段落字下げ。書字方向は `PageTextDirectionType` を設定値で切替（縦書き既定）。`ExportPreset.supportedModes` で非互換プリセットを選択肢から除外。
- **Rationale**: `docx` ライブラリは既に縦書き脚本グリッドで実績があり、見出しスタイル・グリッド・テキスト方向を同 API で表現可能。新規依存ゼロ。
- **Alternatives considered**:
  - PDF 直接生成ライブラリ追加: 縦書き日本語 PDF は表現が難しく、既存 docx 経路（ビューア側で PDF 化）を踏襲する方が安全。
  - クライアント Canvas レンダリング: フォーマット忠実性が落ちる。docx 構造化出力を維持。

## R-06: コンテスト・グループの小説対応（P4）

- **Decision**: `Contest` に `supportedModes: 'screenplayOnly' | 'novelOnly' | 'both'`（既定 `screenplayOnly`、既存はマイグレーションで設定）。応募 UI は対応モードで候補をフィルタし、functions 側が応募受領時に entry の `contentType` を検証して不整合なら 403。`ScriptSnapshot` / `ContestEntry` / `GroupSubmission` に `contentType` を付与。`SubmissionViewPage` / `CorrectionPage` は `contentType` で章一覧・小説プロンプトを分岐。
- **Rationale**: 既存コンテスト・グループ実装を作り直さず、`supportedModes` と `contentType` の追加で拡張できる。サーバー検証で UI バイパス攻撃を二重防御（CA-003）。
- **Alternatives considered**:
  - 小説専用コンテストコレクションを新設: データ重複・管理画面二重化。既存 `contests` 拡張が単純。
  - UI フィルタのみ（サーバー検証なし）: API 直叩きで不整合エントリが混入しうる。403 検証必須。

## R-07: Feature Flag によるロールバック

- **Decision**: `FeatureFlags` に `novelMode: boolean` を追加（既定 `true`、`config/features` で制御）。オフ時は新規作成モーダルの「小説」選択・カタログの小説フィルタ・小説エディタ UI を隠す。`contentType` データ自体は保持（破壊しない）。
- **Rationale**: 既存 `FeatureFlagsContext` のパターンに完全準拠。不具合時にデータ移行を巻き戻さずに UI のみ即時停止でき、CA-005（可逆性）を満たす。
- **Alternatives considered**:
  - 環境変数フラグ: 再デプロイが必要で即応性に欠ける。Firestore `config` ベースの既存方式が優位。

## R-08: 既存脚本リグレッション防止

- **Decision**: 脚本ロジックは `modes/screenplay/` へ「移設するだけ（挙動不変）」とし、移設前後でスナップショットテストを取る。`ScriptToolbar` / `StructurePanel` / `exportService` / `adviceService` の汎用化リファクタには、既存 `001` の quickstart-validation を回帰スイートとして再利用。
- **Rationale**: SC-005 / SC-009（30 日ゼロ件）を満たすには、リファクタが脚本挙動を 1 ビットも変えないことの保証が要る。移設＝同値変換に限定し、差分はモード分岐の注入点のみに閉じる。
- **Alternatives considered**:
  - 脚本ロジックを書き換えながら汎用化: リグレッションリスク増。純粋移設に限定する。
