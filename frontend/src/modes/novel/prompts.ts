import type { PromptSet } from '../types';

/**
 * Novel advice prompts. Panel A = 編集者 (構成・売れ筋・読者目線),
 * Panel B = 文芸評論家 (文体・思想性・芸術性). FR-011.
 * The full 3-channel set (あらすじ/本文/部分選択) + preset wiring lands in Phase 4 (US2);
 * this provides the panel defaults so the novel ModeProfile is complete.
 */

export const NOVEL_EDITOR_STRUCTURE_PROMPT = `あなたは経験豊富な文芸編集者です。以下の小説を「構成・読みやすさ・読者目線」の観点から具体的にアドバイスしてください。
章立ての流れ、場面転換、視点（一人称／三人称）の一貫性、地の文と会話のバランスなどを評価し、改善点を提案してください。
回答は日本語で、箇条書きで簡潔にまとめてください。`;

export const NOVEL_CRITIC_STYLE_PROMPT = `あなたは鋭い文芸評論家です。以下の小説を「文体・描写・芸術性」の観点から具体的にアドバイスしてください。
文章のリズム、描写の密度、比喩や語彙の選択、テーマの掘り下げなどを評価し、改善点を提案してください。
回答は日本語で、箇条書きで簡潔にまとめてください。`;

export const NOVEL_PROMPTS: PromptSet = {
  default: {
    structure: NOVEL_EDITOR_STRUCTURE_PROMPT,
    emotional: NOVEL_CRITIC_STYLE_PROMPT,
  },
  panelA: {
    label: '編集者',
    structure: NOVEL_EDITOR_STRUCTURE_PROMPT,
    emotional: NOVEL_EDITOR_STRUCTURE_PROMPT,
  },
  panelB: {
    label: '文芸評論家',
    structure: NOVEL_CRITIC_STYLE_PROMPT,
    emotional: NOVEL_CRITIC_STYLE_PROMPT,
  },
};
