import { GoogleGenerativeAI } from '@google/generative-ai';

export type AiProvider = 'gemini' | 'claude';

export async function callAi(
  provider: AiProvider,
  systemPrompt: string,
  userText: string,
): Promise<string> {
  if (provider === 'claude') {
    return callClaude(systemPrompt, userText);
  }
  return callGemini(systemPrompt, userText);
}

async function callGemini(systemPrompt: string, userText: string): Promise<string> {
  const apiKey = import.meta.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return 'Gemini APIキーが未設定です。';

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    systemInstruction: { role: 'model', parts: [{ text: systemPrompt }] },
  });

  return result.response.text();
}

async function callClaude(systemPrompt: string, userText: string): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) return 'Anthropic APIキーが未設定です。';

  // Dynamic import to avoid top-level SDK loading issues in browser
  const { default: Anthropic } = await import('@anthropic-ai/sdk');

  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userText }],
  });

  const block = message.content[0];
  return block?.type === 'text' ? block.text : '';
}
