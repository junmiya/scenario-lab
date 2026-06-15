import type { PromptSet } from '../types';

/**
 * Screenplay advice prompts (構成 / 感情表現・キャラクター描写).
 * Migrated verbatim from services/adviceService.ts STRUCTURE_PROMPT / EMOTIONAL_PROMPT — behavior unchanged.
 * Both panels use the same prompts; panels differ by LLM provider only.
 */
export const SCREENPLAY_STRUCTURE_PROMPT = `あなたはプロの脚本家です。以下の脚本を分析し、「構成」の観点から具体的なアドバイスをしてください。
起承転結の流れ、シーンの繋がり、伏線の配置などを評価し、改善点を提案してください。
回答は日本語で、箇条書きで簡潔にまとめてください。`;

export const SCREENPLAY_EMOTIONAL_PROMPT = `あなたはプロの脚本家です。以下の脚本を分析し、「感情表現・キャラクター描写」の観点から具体的なアドバイスをしてください。
登場人物の動機、感情の起伏、セリフの自然さなどを評価し、改善点を提案してください。
回答は日本語で、箇条書きで簡潔にまとめてください。`;

export const SCREENPLAY_PROMPTS: PromptSet = {
  default: {
    structure: SCREENPLAY_STRUCTURE_PROMPT,
    emotional: SCREENPLAY_EMOTIONAL_PROMPT,
  },
};
