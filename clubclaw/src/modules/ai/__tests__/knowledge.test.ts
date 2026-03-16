import { describe, it, expect, afterEach } from 'vitest';
import { loadKnowledge } from '../knowledge.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('loadKnowledge', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      tmpDir = undefined as unknown as string;
    }
  });

  it('reads content from a knowledge file', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clubclaw-kb-'));
    const filePath = path.join(tmpDir, 'knowledge.md');
    fs.writeFileSync(filePath, '# Club Info\nMeetings on Thursdays at 7pm.');

    const content = loadKnowledge(filePath);
    expect(content).toBe('# Club Info\nMeetings on Thursdays at 7pm.');
  });

  it('returns null when file does not exist', () => {
    const content = loadKnowledge('/nonexistent/knowledge.md');
    expect(content).toBeNull();
  });

  it('returns null when file is empty', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clubclaw-kb-'));
    const filePath = path.join(tmpDir, 'knowledge.md');
    fs.writeFileSync(filePath, '');

    const content = loadKnowledge(filePath);
    expect(content).toBeNull();
  });
});
