interface RoleDef {
  name: string;
  emoji: string;
  description?: string;
}

export function matchEmojiToRole(emoji: string, roles: RoleDef[]): string | null {
  const found = roles.find((r) => r.emoji === emoji);
  return found?.name ?? null;
}

export function buildRoleEmbed(roles: RoleDef[]): string {
  return roles
    .map((r) => {
      const desc = r.description ? ` — ${r.description}` : '';
      return `${r.emoji} **${r.name}**${desc}`;
    })
    .join('\n');
}
