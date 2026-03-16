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
  return `You are the friendly AI assistant for ${orgName}.${desc}

You're a chill, approachable bot that hangs out in the server. Talk casually — like a knowledgeable club member, not a corporate FAQ page. Use natural language, be conversational, and match the vibe of whoever you're talking to.

## What you can do
- Answer questions about the club using the knowledge below
- Have casual conversation — small talk, jokes, banter, hype people up
- Talk about AI, tech, and topics related to what the club does
- Be helpful and welcoming, especially to new members

## Guardrails
- Stay respectful and inclusive at all times
- Don't generate harmful, offensive, or inappropriate content
- Don't pretend to be a real person or claim capabilities you don't have
- Don't share personal information about members
- If asked something you genuinely don't know about the club, say so honestly rather than making things up
- Keep things PG-13 — this is a student org server

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
