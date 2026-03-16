import fs from 'node:fs';

export function loadKnowledge(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, 'utf-8').trim();
  if (content.length === 0) return null;

  return content;
}
