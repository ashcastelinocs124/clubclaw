import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from './config/index.js';
import { createDatabase } from './db/index.js';
import { createClient, registerCommands } from './bot/index.js';
import { initOnboarding } from './modules/onboarding/index.js';
import { initChannels } from './modules/channels/index.js';
import { initAnnouncements, getAnnouncementCommands } from './modules/announcements/index.js';
import { initAi } from './modules/ai/index.js';

async function main() {
  // 1. Load config
  const configPath = process.env.CLUBCLAW_CONFIG || path.resolve(process.cwd(), '..', 'clubclaw.yaml');
  console.log(`Loading config from ${configPath}`);
  const config = loadConfig(configPath);
  console.log(`Loaded config for org: ${config.org.name}`);

  // 2. Init database
  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = process.env.CLUBCLAW_DB || path.join(dataDir, 'clubclaw.db');
  const db = createDatabase(dbPath);
  console.log('Database initialized');

  // 3. Create Discord client
  const client = createClient();

  // 4. Init modules (register event listeners before login)
  initOnboarding(client, config, db);
  initChannels(client, config, db);
  initAnnouncements(client, config, db);
  initAi(client, config, db);

  // 5. Register slash commands on ready
  client.once('ready', async (c) => {
    console.log(`Logged in as ${c.user.tag}`);

    const commands = [...getAnnouncementCommands()];
    if (commands.length > 0) {
      await registerCommands(
        config.discord.token,
        c.user.id,
        config.discord.guild_id,
        commands
      );
    }
  });

  // 6. Login
  await client.login(config.discord.token);

  // Graceful shutdown
  const shutdown = () => {
    console.log('Shutting down...');
    client.destroy();
    db.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
