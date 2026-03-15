import { describe, it, expect } from 'vitest';
import { resolveEnvVars, loadConfig } from '../loader.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('resolveEnvVars', () => {
  it('replaces ${VAR} with environment variable value', () => {
    process.env.TEST_TOKEN = 'abc123';
    expect(resolveEnvVars('${TEST_TOKEN}')).toBe('abc123');
    delete process.env.TEST_TOKEN;
  });

  it('leaves strings without env vars unchanged', () => {
    expect(resolveEnvVars('hello world')).toBe('hello world');
  });

  it('throws on missing env var', () => {
    expect(() => resolveEnvVars('${MISSING_VAR}')).toThrow('MISSING_VAR');
  });
});

describe('loadConfig', () => {
  it('loads and validates a valid YAML config', () => {
    const configYaml = `
org:
  name: "Test Club"
discord:
  token: "test-token"
  guild_id: "123"
onboarding:
  welcome_channel: "welcome"
  welcome_message: "Hello {member}!"
  roles:
    - name: "Dev"
      emoji: "💻"
`;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clubclaw-'));
    const tmpFile = path.join(tmpDir, 'clubclaw.yaml');
    fs.writeFileSync(tmpFile, configYaml);

    const config = loadConfig(tmpFile);
    expect(config.org.name).toBe('Test Club');
    expect(config.onboarding?.roles).toHaveLength(1);
    expect(config.onboarding?.roles[0].name).toBe('Dev');

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('throws on missing config file', () => {
    expect(() => loadConfig('/nonexistent/path.yaml')).toThrow('Config file not found');
  });

  it('resolves env vars in config values', () => {
    process.env.TEST_BOT_TOKEN = 'secret-token';
    const configYaml = `
org:
  name: "Test Club"
discord:
  token: "\${TEST_BOT_TOKEN}"
  guild_id: "123"
`;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clubclaw-'));
    const tmpFile = path.join(tmpDir, 'clubclaw.yaml');
    fs.writeFileSync(tmpFile, configYaml);

    const config = loadConfig(tmpFile);
    expect(config.discord.token).toBe('secret-token');

    fs.rmSync(tmpDir, { recursive: true });
    delete process.env.TEST_BOT_TOKEN;
  });
});
