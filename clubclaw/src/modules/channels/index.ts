import {
  type Client,
  type Guild,
  ChannelType,
  PermissionsBitField,
  type TextChannel,
} from 'discord.js';
import cron from 'node-cron';
import type { ClubClawConfig } from '../../config/index.js';
import type { Database } from '../../db/index.js';
import { diffChannels } from './reconcile.js';
import { isChannelInactive } from './archive.js';

async function reconcileGuild(guild: Guild, config: ClubClawConfig): Promise<void> {
  const channelsConfig = config.channels;
  if (!channelsConfig) return;

  for (const category of channelsConfig.categories) {
    // Find or create category
    let discordCategory = guild.channels.cache.find(
      (ch) => ch.name === category.name && ch.type === ChannelType.GuildCategory
    );

    if (!discordCategory) {
      discordCategory = await guild.channels.create({
        name: category.name,
        type: ChannelType.GuildCategory,
      });
      console.log(`Created category: ${category.name}`);
    }

    // Diff channels
    const existingNames = guild.channels.cache
      .filter((ch) => ch.parentId === discordCategory!.id)
      .map((ch) => ch.name);

    const diff = diffChannels(category.channels, Array.from(existingNames));

    for (const ch of diff.toCreate) {
      const permissionOverwrites = ch.access.length > 0
        ? [
            {
              id: guild.roles.everyone.id,
              deny: [PermissionsBitField.Flags.ViewChannel],
            },
            ...ch.access.map((roleName) => {
              const role = guild.roles.cache.find((r) => r.name === roleName);
              return role
                ? {
                    id: role.id,
                    allow: [PermissionsBitField.Flags.ViewChannel],
                  }
                : null;
            }).filter(Boolean) as { id: string; allow: bigint[] }[],
          ]
        : [];

      await guild.channels.create({
        name: ch.name,
        type: ChannelType.GuildText,
        parent: discordCategory.id,
        permissionOverwrites,
      });
      console.log(`Created channel: #${ch.name} under ${category.name}`);
    }
  }
}

export function initChannels(
  client: Client,
  config: ClubClawConfig,
  db: Database
): void {
  const channelsConfig = config.channels;
  if (!channelsConfig) {
    console.log('Channels module: disabled (no config)');
    return;
  }

  // Reconcile on startup
  client.once('ready', async () => {
    const guild = client.guilds.cache.get(config.discord.guild_id);
    if (!guild) {
      console.error(`Guild ${config.discord.guild_id} not found`);
      return;
    }
    await reconcileGuild(guild, config);
    console.log('Channel reconciliation complete');
  });

  // Auto-archive cron (runs daily at midnight)
  if (channelsConfig.auto_archive?.enabled) {
    cron.schedule('0 0 * * *', async () => {
      const guild = client.guilds.cache.get(config.discord.guild_id);
      if (!guild) return;

      const inactiveDays = channelsConfig.auto_archive!.inactive_days;
      const textChannels = guild.channels.cache.filter(
        (ch) => ch.type === ChannelType.GuildText
      );

      for (const [, channel] of textChannels) {
        const textChannel = channel as TextChannel;
        if (isChannelInactive(textChannel, inactiveDays)) {
          await textChannel.send(
            `This channel has been inactive for ${inactiveDays}+ days and will be archived.`
          );
          // TextChannels can't be archived directly; rename with prefix instead
          if (!textChannel.name.startsWith('archived-')) {
            await textChannel.setName(`archived-${textChannel.name}`);
          }
          db.logAudit('channel_archive', null, `Archived #${textChannel.name}`);
          console.log(`Archived #${textChannel.name}`);
        }
      }
    });
  }

  console.log('Channels module: initialized');
}
