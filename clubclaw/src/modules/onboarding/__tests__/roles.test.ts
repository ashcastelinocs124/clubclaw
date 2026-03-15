import { describe, it, expect } from 'vitest';
import { buildRoleEmbed, matchEmojiToRole } from '../roles.js';

describe('matchEmojiToRole', () => {
  const roles = [
    { name: 'Frontend', emoji: '🎨' },
    { name: 'Backend', emoji: '⚙️' },
  ];

  it('matches an emoji to the correct role', () => {
    expect(matchEmojiToRole('🎨', roles)).toBe('Frontend');
  });

  it('returns null for unknown emoji', () => {
    expect(matchEmojiToRole('🔥', roles)).toBeNull();
  });
});

describe('buildRoleEmbed', () => {
  it('formats roles into an embed description', () => {
    const roles = [
      { name: 'Frontend', emoji: '🎨', description: 'Frontend team' },
      { name: 'Backend', emoji: '⚙️' },
    ];
    const desc = buildRoleEmbed(roles);
    expect(desc).toContain('🎨');
    expect(desc).toContain('Frontend');
    expect(desc).toContain('Frontend team');
    expect(desc).toContain('⚙️');
    expect(desc).toContain('Backend');
  });
});
