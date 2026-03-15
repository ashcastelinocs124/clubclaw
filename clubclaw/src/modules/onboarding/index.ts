import {
  type Client,
  type TextChannel,
  type GuildMember,
  type MessageReaction,
  type User,
  type PartialMessageReaction,
  type PartialUser,
} from 'discord.js';
import type { ClubClawConfig } from '../../config/index.js';
import type { Database } from '../../db/index.js';
import { matchEmojiToRole } from './roles.js';
import { sendWelcomeMessage } from './welcome.js';

export function initOnboarding(
  client: Client,
  config: ClubClawConfig,
  db: Database
): void {
  const onboarding = config.onboarding;
  if (!onboarding) {
    console.log('Onboarding module: disabled (no config)');
    return;
  }

  // Handle new member joins
  client.on('guildMemberAdd', async (member: GuildMember) => {
    try {
      const channel = member.guild.channels.cache.find(
        (ch) => ch.name === onboarding.welcome_channel
      ) as TextChannel | undefined;

      if (!channel) {
        console.error(`Welcome channel "${onboarding.welcome_channel}" not found`);
        return;
      }

      await sendWelcomeMessage(channel, member, config);
      db.upsertMember(member.guild.id, member.id, false, []);
      db.logAudit('member_join', member.id, `${member.user.tag} joined`);
      console.log(`Welcomed ${member.user.tag}`);
    } catch (err) {
      console.error('Error in onboarding:', err);
    }
  });

  // Handle reaction-based role assignment
  client.on(
    'messageReactionAdd',
    async (
      reaction: MessageReaction | PartialMessageReaction,
      user: User | PartialUser
    ) => {
      if (user.bot) return;

      // Fetch partials if needed
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();

      const guild = reaction.message.guild;
      if (!guild) return;

      const emoji = reaction.emoji.name;
      if (!emoji) return;

      const member = await guild.members.fetch(user.id);

      // Verification check
      if (
        emoji === '✅' &&
        onboarding.verification?.enabled
      ) {
        const verifyRole = guild.roles.cache.find(
          (r) => r.name === onboarding.verification!.role
        );
        if (verifyRole) {
          await member.roles.add(verifyRole);
          db.upsertMember(guild.id, user.id, true, member.roles.cache.map((r) => r.name));
          db.logAudit('verify', user.id, `Verified via reaction`);
          console.log(`Verified ${user.id}`);
        }
        return;
      }

      // Role assignment
      const roleName = matchEmojiToRole(emoji, onboarding.roles);
      if (roleName) {
        const role = guild.roles.cache.find((r) => r.name === roleName);
        if (role) {
          await member.roles.add(role);
          const currentRoles = member.roles.cache.map((r) => r.name);
          db.upsertMember(guild.id, user.id, true, currentRoles);
          db.logAudit('role_assign', user.id, `Assigned ${roleName}`);
          console.log(`Assigned role ${roleName} to ${user.id}`);
        }
      }
    }
  );

  console.log('Onboarding module: initialized');
}
