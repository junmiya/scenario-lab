import type { AdviceProvider } from '../stores/adviceStore';
import { isFunctionsApiConfigured, postFunctionsJson, requestFunctionsJson } from './functionsApi';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AdviceModelDescriptor {
  provider: AdviceProvider;
  label: string;
  enabled: boolean;
}

export interface AdviceFeedback {
  provider: AdviceProvider;
  structureFeedback: string;
  emotionalFeedback: string;
}

export interface AdviceResponse {
  panelA: AdviceFeedback;
  panelB: AdviceFeedback;
}

export interface GenerateAdviceInput {
  documentId: string;
  synopsis: string;
  content: string;
  selectedText?: string;
  panelAProvider: AdviceProvider;
  panelBProvider: AdviceProvider;
  panelAPreset: string;
  panelBPreset: string;
}

const fallbackModels: AdviceModelDescriptor[] = [
  { provider: 'gemini', label: 'Gemini', enabled: true },
  { provider: 'openai', label: 'OpenAI', enabled: false },
  { provider: 'anthropic', label: 'Anthropic', enabled: false },
];

// --- AI Prompt Templates ---

const STRUCTURE_PROMPT = `あなたはプロの脚本家です。以下の脚本を分析し、「構成」の観点から具体的なアドバイスをしてください。
起承転結の流れ、シーンの繋がり、伏線の配置などを評価し、改善点を提案してください。
回答は日本語で、箇条書きで簡潔にまとめてください。`;

const EMOTIONAL_PROMPT = `あなたはプロの脚本家です。以下の脚本を分析し、「感情表現・キャラクター描写」の観点から具体的なアドバイスをしてください。
登場人物の動機、感情の起伏、セリフの自然さなどを評価し、改善点を提案してください。
回答は日本語で、箇条書きで簡潔にまとめてください。`;

/**
 * Call Gemini API directly from the browser (prototyping mode).
 */
async function callGemini(systemPrompt: string, userContent: string): Promise<string> {
  const apiKey = import.meta.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return 'Gemini APIキーが設定されていません。.env.localにVITE_GOOGLE_GENERATIVE_AI_API_KEYを設定してください。';
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userContent }] }],
      systemInstruction: { role: 'model', parts: [{ text: systemPrompt }] },
    });

    return result.response.text();
  } catch (error) {
    console.error('Gemini API error:', error);
    return `AI生成エラー: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * Build the user content string from synopsis and script body.
 */
function buildUserContent(synopsis: string, content: string, selectedText?: string): string {
  const parts: string[] = [];
  if (synopsis) {
    parts.push(`【あらすじ】\n${synopsis}`);
  }
  if (selectedText) {
    parts.push(`【選択テキスト】\n${selectedText}`);
  }
  if (content) {
    parts.push(`【本文】\n${content.slice(0, 8000)}`);
  }
  return parts.join('\n\n') || '（本文が入力されていません）';
}

/**
 * Generate advice for a single panel using the AI.
 */
async function generatePanelAdvice(
  provider: AdviceProvider,
  _preset: string,
  synopsis: string,
  content: string,
  selectedText?: string,
): Promise<AdviceFeedback> {
  const userContent = buildUserContent(synopsis, content, selectedText);

  if (provider === 'gemini') {
    const [structureFeedback, emotionalFeedback] = await Promise.all([
      callGemini(STRUCTURE_PROMPT, userContent),
      callGemini(EMOTIONAL_PROMPT, userContent),
    ]);
    return { provider, structureFeedback, emotionalFeedback };
  }

  // Fallback for unsupported providers in prototype mode
  return {
    provider,
    structureFeedback: `${provider}プロバイダーはプロトタイプモードでは未対応です。GeminiをPanelに選択してください。`,
    emotionalFeedback: `${provider}プロバイダーはプロトタイプモードでは未対応です。GeminiをPanelに選択してください。`,
  };
}

export async function generateAdvice(input: GenerateAdviceInput): Promise<AdviceResponse> {
  if (isFunctionsApiConfigured()) {
    return postFunctionsJson<AdviceResponse>('/api/advice/generate', {
      documentId: input.documentId,
      synopsis: input.synopsis,
      content: input.content,
      selectedText: input.selectedText,
      panelAProvider: input.panelAProvider,
      panelBProvider: input.panelBProvider,
    });
  }

  // Direct client-side AI call (prototype mode)
  const [panelA, panelB] = await Promise.all([
    generatePanelAdvice(
      input.panelAProvider,
      input.panelAPreset,
      input.synopsis,
      input.content,
      input.selectedText,
    ),
    generatePanelAdvice(
      input.panelBProvider,
      input.panelBPreset,
      input.synopsis,
      input.content,
      input.selectedText,
    ),
  ]);

  return { panelA, panelB };
}

export async function listAdviceModels(): Promise<AdviceModelDescriptor[]> {
  if (isFunctionsApiConfigured()) {
    return requestFunctionsJson<AdviceModelDescriptor[]>('GET', '/api/advice/models');
  }

  return fallbackModels;
}
