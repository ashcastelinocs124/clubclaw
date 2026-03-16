import { type Client, type Message, ChannelType } from 'discord.js';
import path from 'node:path';
import type { ClubClawConfig } from '../../config/index.js';
import type { Database } from '../../db/index.js';
import { loadKnowledge } from './knowledge.js';
import { initOpenAI, buildSystemPrompt, askQuestion } from './chat.js';

export function initAi(
  client: Client,
  config: ClubClawConfig,
  db: Database
): void {
  const aiConfig = config.ai;
  if (!aiConfig?.enabled) {
    console.log('AI module: disabled (ai.enabled is false)');
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('AI module: OPENAI_API_KEY not set, disabling');
    return;
  }

  initOpenAI(apiKey);

  const knowledgePath = path.resolve(process.cwd(), '..', aiConfig.knowledge_file);
  const brainPath = path.resolve(process.cwd(), '..', 'brain.md');

  client.on('messageCreate', async (message: Message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    const isMentioned = message.mentions.has(client.user!);
    const isDM = message.channel.type === ChannelType.DM;

    if (!isMentioned && !isDM) return;

    // Strip the bot mention from the message
    let question = message.content;
    if (isMentioned && client.user) {
      question = question.replace(`<@${client.user.id}>`, '').trim();
    }

    if (!question) return;

    try {
      // Show typing indicator
      if ('sendTyping' in message.channel) {
        await message.channel.sendTyping();
      }

      // Load brain and knowledge fresh each time
      const brain = loadKnowledge(brainPath);
      const knowledge = loadKnowledge(knowledgePath);

      if (!brain) {
        await message.reply(
          'No brain has been set up yet. Ask a club officer to create brain.md.'
        );
        return;
      }

      if (!knowledge) {
        await message.reply(
          'No knowledge base has been set up yet. Ask a club officer to create knowledge.md.'
        );
        return;
      }

      const systemPrompt = buildSystemPrompt(brain, knowledge);

      const answer = await askQuestion(question, systemPrompt, aiConfig.model);

      await message.reply(answer);

      db.logAudit('ai_question', message.author.id, question.slice(0, 100));
    } catch (err) {
      console.error('AI module error:', err);
      await message.reply('Sorry, I encountered an error. Please try again later.');
    }
  });

  console.log('AI module: initialized');
}
