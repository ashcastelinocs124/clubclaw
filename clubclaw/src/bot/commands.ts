import {
  REST,
  Routes,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';

export async function registerCommands(
  token: string,
  clientId: string,
  guildId: string,
  commands: RESTPostAPIChatInputApplicationCommandsJSONBody[]
): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(token);
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
    body: commands,
  });
  console.log(`Registered ${commands.length} slash commands`);
}
