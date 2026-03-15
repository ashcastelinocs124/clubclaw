import { type TextChannel, ChannelType } from 'discord.js';

export function isChannelInactive(
  channel: TextChannel,
  inactiveDays: number
): boolean {
  const now = Date.now();
  const lastMessage = channel.lastMessageId;
  if (!lastMessage) return true;

  // Discord snowflake: (id >> 22) + 1420070400000 = timestamp
  const lastMessageTimestamp = Number(BigInt(lastMessage) >> 22n) + 1420070400000;
  const daysSinceLastMessage = (now - lastMessageTimestamp) / (1000 * 60 * 60 * 24);
  return daysSinceLastMessage >= inactiveDays;
}
