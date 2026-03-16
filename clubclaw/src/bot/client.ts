import { Client, GatewayIntentBits, Partials } from 'discord.js';

export function createClient(): Client {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.DirectMessageReactions,
    ],
    partials: [
      Partials.Message,
      Partials.Reaction,
      Partials.GuildMember,
      Partials.Channel,
    ],
  });
}
