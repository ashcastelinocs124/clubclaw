import { EmbedBuilder, type TextChannel, type GuildMember } from 'discord.js';
import type { ClubClawConfig } from '../../config/index.js';
import { buildRoleEmbed } from './roles.js';

export function formatWelcomeMessage(
  template: string,
  member: GuildMember,
  orgName: string
): string {
  return template
    .replace(/\{member\}/g, `<@${member.id}>`)
    .replace(/\{org\}/g, orgName);
}

export async function sendWelcomeMessage(
  channel: TextChannel,
  member: GuildMember,
  config: ClubClawConfig
): Promise<void> {
  const onboarding = config.onboarding;
  if (!onboarding) return;

  const message = formatWelcomeMessage(
    onboarding.welcome_message,
    member,
    config.org.name
  );

  const embed = new EmbedBuilder()
    .setTitle(`Welcome to ${config.org.name}!`)
    .setDescription(message)
    .setColor(0x5865f2);

  if (onboarding.roles.length > 0) {
    embed.addFields({
      name: 'Pick your roles',
      value: buildRoleEmbed(onboarding.roles),
    });
  }

  const sent = await channel.send({ embeds: [embed] });

  // Add role reaction emojis
  for (const role of onboarding.roles) {
    await sent.react(role.emoji);
  }

  // Add verification emoji if enabled
  if (onboarding.verification?.enabled) {
    await sent.react('✅');
  }
}
