/**
 * Server-side novel advice prompts.
 * Panel A = 編集者 (構成・売れ筋・読者目線), Panel B = 文芸評論家 (文体・思想性・芸術性).
 * Full implementation lands in Phase 4 (US2). Placeholder kept so the mode-routing
 * scaffolding in providerGateway can compile and be wired incrementally.
 */

export const NOVEL_EDITOR_PROMPT = `あなたは経験豊富な文芸編集者です。以下の小説を「構成・読みやすさ・読者目線」の観点から具体的にアドバイスしてください。
章立ての流れ、場面転換、視点（一人称／三人称）の一貫性、地の文と会話のバランスなどを評価し、改善点を提案してください。
回答は日本語で、箇条書きで簡潔にまとめてください。`;

export const NOVEL_CRITIC_PROMPT = `あなたは鋭い文芸評論家です。以下の小説を「文体・描写・芸術性」の観点から具体的にアドバイスしてください。
文章のリズム、描写の密度、比喩や語彙の選択、テーマの掘り下げなどを評価し、改善点を提案してください。
回答は日本語で、箇条書きで簡潔にまとめてください。`;

export const NOVEL_PANEL_PROMPTS = {
  // Default (used when a panel-specific prompt is not selected).
  structure: NOVEL_EDITOR_PROMPT,
  emotional: NOVEL_CRITIC_PROMPT,
} as const;
