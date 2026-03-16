import OpenAI from 'openai';

let client: OpenAI | null = null;

export function initOpenAI(apiKey: string): void {
  client = new OpenAI({ apiKey });
}

export function buildSystemPrompt(
  orgName: string,
  orgDescription: string | undefined,
  knowledge: string
): string {
  const desc = orgDescription ? ` ${orgDescription}` : '';
  return `You are the AI assistant for ${orgName}.${desc}

You can ONLY answer questions about the club using the knowledge provided below.
If someone asks something unrelated to the club, politely say:
"I can only help with questions about ${orgName}."

Keep answers concise and friendly.

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
