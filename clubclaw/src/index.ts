import 'dotenv/config';
import path from 'node:path';
import { loadConfig } from './config/index.js';
import { createDatabase } from './db/index.js';
import { createClient } from './bot/index.js';

async function main() {
  // 1. Load config
  const configPath = process.env.CLUBCLAW_CONFIG || path.resolve(process.cwd(), '..', 'clubclaw.yaml');
  console.log(`Loading config from ${configPath}`);
  const config = loadConfig(configPath);
  console.log(`Loaded config for org: ${config.org.name}`);

  // 2. Init database
  const dbPath = process.env.CLUBCLAW_DB || path.resolve(process.cwd(), 'data', 'clubclaw.db');
  const db = createDatabase(dbPath);
  console.log('Database initialized');

  // 3. Create Discord client
  const client = createClient();

  client.once('ready', (c) => {
    console.log(`Logged in as ${c.user.tag}`);
  });

  // 4. Login
  await client.login(config.discord.token);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down...');
    client.destroy();
    db.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
