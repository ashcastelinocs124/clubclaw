import OpenAI from 'openai';

let client: OpenAI | null = null;

export function initOpenAI(apiKey: string): void {
  client = new OpenAI({ apiKey });
}

export function buildSystemPrompt(
  brain: string,
  knowledge: string
): string {
  return `${brain}

## Club Knowledge

${knowledge}`;
}

export async function askQuestion(
  question: string,
  systemPrompt: string,
  model: string
): Promise<string> {
  if (!client) {
    throw new Error('OpenAI client not initialized. Set OPENAI_API_KEY.');
  }

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
    max_tokens: 1024,
  });

  return response.choices[0]?.message?.content ?? 'Sorry, I could not generate a response.';
}
