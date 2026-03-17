import { type Client, type Message, ChannelType } from 'discord.js';
import path from 'node:path';
import type { ClubClawConfig } from '../../config/index.js';
import type { Database } from '../../db/index.js';
import { loadKnowledge } from './knowledge.js';
import { initOpenAI, buildSystemPrompt, askQuestion } from './chat.js';
import { sanitizeInput, sanitizeOutput, RateLimiter, hasAllowedRole } from './guardrails.js';

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

  const knowledgePath = path.resolve(process.cwd(), '..', 'brain', 'knowledge', aiConfig.knowledge_file);
  const brainPath = path.resolve(process.cwd(), '..', 'brain', 'brain.md');

  const allowedRoles = aiConfig.allowed_roles ?? [];
  const rateLimit = aiConfig.rate_limit ?? 10;
  const rateLimiter = new RateLimiter(rateLimit);

  client.on('messageCreate', async (message: Message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    const isMentioned = message.mentions.has(client.user!);
    const isDM = message.channel.type === ChannelType.DM;

    if (!isMentioned && !isDM) return;

    // ---------------------------------------------------------------
    // 1. Role check
    // ---------------------------------------------------------------
    if (allowedRoles.length > 0) {
      let userRoles: string[] = [];

      if (isDM) {
        // For DMs, look up the member from the guild cache
        const guild = client.guilds.cache.get(config.discord.guild_id);
        if (guild) {
          try {
            const member = await guild.members.fetch(message.author.id);
            userRoles = member.roles.cache.map((r) => r.name);
          } catch {
            // Member not in guild or fetch failed — no roles
            userRoles = [];
          }
        }
      } else if (message.member) {
        userRoles = message.member.roles.cache.map((r) => r.name);
      }

      if (!hasAllowedRole(allowedRoles, userRoles)) {
        await message.reply(
          'you need to be a verified member to use this! react in #welcome to get started'
        );
        return;
      }
    }

    // ---------------------------------------------------------------
    // 2. Rate limit
    // ---------------------------------------------------------------
    if (!rateLimiter.check(message.author.id)) {
      await message.reply(
        "you're asking a lot of questions! chill for a bit and try again later"
      );
      return;
    }

    // ---------------------------------------------------------------
    // 3. Strip mention, check if empty
    // ---------------------------------------------------------------
    let question = message.content;
    if (isMentioned && client.user) {
      question = question.replace(`<@${client.user.id}>`, '').trim();
    }

    if (!question) return;

    // ---------------------------------------------------------------
    // 4. Input sanitization
    // ---------------------------------------------------------------
    const inputCheck = sanitizeInput(question);
    if (!inputCheck.ok) {
      if (inputCheck.reason === 'blocked') {
        await message.reply('nice try lol, i can\'t do that');
      } else {
        await message.reply("that's way too long, keep it short!");
      }
      return;
    }

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

      // ---------------------------------------------------------------
      // 5. OpenAI call
      // ---------------------------------------------------------------
      const answer = await askQuestion(question, systemPrompt, aiConfig.model);

      // ---------------------------------------------------------------
      // 6. Output filtering
      // ---------------------------------------------------------------
      const outputCheck = sanitizeOutput(answer);
      if (!outputCheck.ok) {
        console.warn('AI module: output blocked by guardrails', { userId: message.author.id, question: question.slice(0, 100) });
        await message.reply('hmm something went wrong, try asking that differently');
        return;
      }

      // ---------------------------------------------------------------
      // 7. Reply with filtered content
      // ---------------------------------------------------------------
      await message.reply(outputCheck.content);

      db.logAudit('ai_question', message.author.id, question.slice(0, 100));
    } catch (err) {
      console.error('AI module error:', err);
      await message.reply('Sorry, I encountered an error. Please try again later.');
    }
  });

  const rolesDisplay = allowedRoles.length > 0 ? allowedRoles.join(', ') : 'all';
  console.log(`AI module: initialized (roles: ${rolesDisplay}, rate limit: ${rateLimit}/hr)`);
}
