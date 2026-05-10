/**
 * Scenario Lab リリースノート
 *
 * 各リリースは利用者向けに「使ってわかる変化」を中心に記述。
 * 詳細な技術変更は CHANGELOG.md（リポジトリ）を参照。
 */

export type ReleaseTag = 'feature' | 'improvement' | 'fix' | 'security';

export interface ReleaseItem {
    tag: ReleaseTag;
    text: string;
}

export interface Release {
    version: string;
    date: string; // YYYY-MM-DD
    title: string;
    summary: string;
    items: ReleaseItem[];
}

export const TAG_LABELS: Record<ReleaseTag, string> = {
    feature: '新機能',
    improvement: '改善',
    fix: '修正',
    security: 'セキュリティ',
};

export const TAG_COLORS: Record<ReleaseTag, { bg: string; fg: string }> = {
    feature: { bg: '#e8f5e9', fg: '#1b5e20' },
    improvement: { bg: '#e3f2fd', fg: '#0d47a1' },
    fix: { bg: '#fff3e0', fg: '#bf360c' },
    security: { bg: '#fce4ec', fg: '#880e4f' },
};

/**
 * リリース一覧（新しい順）
 */
export const releases: Release[] = [
    {
        version: '0.4.0',
        date: '2026-05-08',
        title: '本番リリース＆ブランド統合',
        summary:
            'Firebase Hosting への初回本番デプロイ。製品名「Scenario Lab」へのパッケージ名統一と、開発フロー基盤の整備を実施。',
        items: [
            { tag: 'feature', text: 'リリースノートタブを追加（このページ）' },
            { tag: 'feature', text: '本番環境を Firebase Hosting にデプロイ（https://scenariolab-studio.web.app）' },
            { tag: 'improvement', text: 'パッケージ名を `@scenario-lab/*` に統一（旧 scenario-writing-lab）' },
            { tag: 'improvement', text: 'CI に auto-format ステップ・Hosting デプロイワークフローを追加' },
            { tag: 'improvement', text: '仕様書に Q1–Q5 の明確化セッションを統合（AI プロバイダー、失敗ハンドリング、エクスポート形式、ストレージ、認証方式）' },
            { tag: 'improvement', text: 'speckit エージェントスキル（clarify / plan / tasks / implement 等）を追加' },
        ],
    },
    {
        version: '0.3.0',
        date: '2026-04-13',
        title: '管理ダッシュボード＆コミュニティ機能',
        summary:
            '運営者向けの統計・管理画面と、グループ・コンテストによる共同利用機能を追加。提出書式に合わせたテンプレート出力にも対応。',
        items: [
            { tag: 'feature', text: '管理ダッシュボード（タブ式・統計カード・グループ管理）を追加' },
            { tag: 'feature', text: 'グループ機能（脚本提出・先生/生徒/評価者の役割管理）' },
            { tag: 'feature', text: 'コンテスト機能（応募管理・詳細閲覧・エントリー）' },
            { tag: 'feature', text: 'テンプレートベースの脚本出力（応募用 docx テンプレートに合わせた書式）' },
            { tag: 'feature', text: '形式プリセット（投稿先ごとの行数・文字数設定）' },
            { tag: 'fix', text: 'テンプレート出力時のフォント保持とフィールドマッピングのフォールバックを修正' },
        ],
    },
    {
        version: '0.2.0',
        date: '2026-03-12',
        title: 'Scenario Lab リブランド＆縦書き拡張',
        summary:
            '製品名を「Scenario Writing Lab」から「Scenario Lab」へリブランド。縦書きキャラクター編集と AI ディスカッションパネル、200字詰原稿用紙準拠の出力を実装。',
        items: [
            { tag: 'feature', text: '製品名を「Scenario Lab」に変更（タイトル・エクスポート・UI 文言）' },
            { tag: 'feature', text: '縦書きキャラクター編集パネル' },
            { tag: 'feature', text: 'AI ディスカッションパネル（複数 AI による多視点アドバイス）' },
            { tag: 'feature', text: '構造ガイド（シノプシスと脚本の対応マッピング）' },
            { tag: 'feature', text: 'エクスポートプレビュー画面' },
            { tag: 'feature', text: '200字詰原稿用紙準拠の `linesPerPage` 設定（脚本提出書式に合わせて自動整形）' },
            { tag: 'feature', text: 'V2 縦書きエディタ（IME・popup ログイン対応強化、2026-05 追加）' },
            { tag: 'improvement', text: 'プレーンテキスト形式（.txt）のエクスポート・タイトル別ページ・「Save As」ダイアログ対応' },
            { tag: 'fix', text: 'popup ブロック時に signInWithRedirect へフォールバック（ログイン安定化）' },
            { tag: 'fix', text: 'V2 エディタでの popup 閉じ時の redirect フォールバック' },
        ],
    },
    {
        version: '0.1.0',
        date: '2026-02-26',
        title: 'MVP — クラウド保存と AI コラボ',
        summary:
            'Firebase Authentication（Google + メール/パスワード）と Firestore による永続化を導入。3人の専門家による多視点 AI 講評と、AI プロバイダー選択を実装。',
        items: [
            { tag: 'feature', text: '縦書きエディタ（テキストエリアベース、IME 入力対応）' },
            { tag: 'feature', text: 'Word（.docx）インポート（mammoth 経由）' },
            { tag: 'feature', text: '2系統の AI アドバイスパネル（独立したモデル選択可能）' },
            { tag: 'feature', text: '3人の専門家による AI 講評パネル' },
            { tag: 'feature', text: 'AI プロバイダー選択（OpenAI / Anthropic / Gemini）' },
            { tag: 'feature', text: 'シノプシスの自動講評（Gemini direct）' },
            { tag: 'feature', text: 'シノプシス・キャラクター・本文の Firestore 保存／読込' },
            { tag: 'feature', text: 'カタログ（マイ脚本）・ログイン・共通レイアウト' },
            { tag: 'feature', text: 'Firebase Authentication（Google ログイン + メール/パスワード）' },
            { tag: 'feature', text: '改稿マーカー（before/after 比較）' },
            { tag: 'feature', text: 'シノプシス縦書きパネル' },
            { tag: 'security', text: 'Firestore セキュリティルールで作成時の `ownerId` 検証を強制' },
            { tag: 'fix', text: 'IME 英語入力時の文字消失を防止' },
        ],
    },
];
