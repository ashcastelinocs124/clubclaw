import { type Client, type TextChannel, SlashCommandBuilder } from 'discord.js';
import cron from 'node-cron';
import type { ClubClawConfig } from '../../config/index.js';
import type { Database } from '../../db/index.js';

export function getAnnouncementCommands() {
  return [
    new SlashCommandBuilder()
      .setName('announce')
      .setDescription('Send an announcement to the announcements channel')
      .addStringOption((opt) =>
        opt
          .setName('message')
          .setDescription('The announcement message')
          .setRequired(true)
      )
      .toJSON(),
  ];
}

export function initAnnouncements(
  client: Client,
  config: ClubClawConfig,
  db: Database
): void {
  const announcementsConfig = config.announcements;
  if (!announcementsConfig) {
    console.log('Announcements module: disabled (no config)');
    return;
  }

  // Register scheduled messages
  for (const scheduled of announcementsConfig.scheduled) {
    if (!cron.validate(scheduled.cron)) {
      console.error(`Invalid cron expression: ${scheduled.cron}`);
      continue;
    }

    const targetChannelName = scheduled.channel ?? announcementsConfig.channel;

    cron.schedule(scheduled.cron, async () => {
      const guild = client.guilds.cache.get(config.discord.guild_id);
      if (!guild) return;

      const channel = guild.channels.cache.find(
        (ch) => ch.name === targetChannelName
      ) as TextChannel | undefined;

      if (!channel) {
        console.error(`Announcements channel "${targetChannelName}" not found`);
        return;
      }

      await channel.send(scheduled.message);
      db.logAudit('announcement', null, `Scheduled: ${scheduled.message.slice(0, 50)}`);
      console.log(`Sent scheduled announcement to #${targetChannelName}`);
    });

    console.log(`Scheduled: "${scheduled.message.slice(0, 40)}..." at ${scheduled.cron}`);
  }

  // Handle /announce slash command
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'announce') return;

    const message = interaction.options.getString('message', true);
    const guild = interaction.guild;
    if (!guild) return;

    const channel = guild.channels.cache.find(
      (ch) => ch.name === announcementsConfig.channel
    ) as TextChannel | undefined;

    if (!channel) {
      await interaction.reply({
        content: `Channel "${announcementsConfig.channel}" not found.`,
        ephemeral: true,
      });
      return;
    }

    await channel.send(message);
    db.logAudit('announcement', interaction.user.id, `Ad-hoc: ${message.slice(0, 50)}`);
    await interaction.reply({ content: 'Announcement sent!', ephemeral: true });
  });

  console.log('Announcements module: initialized');
}
