import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabase, type Database } from '../index.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('Database', () => {
  let db: Database;
  let dbPath: string;

  beforeEach(() => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clubclaw-db-'));
    dbPath = path.join(tmpDir, 'test.db');
    db = createDatabase(dbPath);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(path.dirname(dbPath), { recursive: true });
  });

  it('creates tables on init', () => {
    const tables = db.raw
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);
    expect(names).toContain('members');
    expect(names).toContain('scheduled_messages');
    expect(names).toContain('audit_log');
  });

  it('inserts and retrieves a member', () => {
    db.upsertMember('guild1', 'user1', true, ['Dev']);
    const member = db.getMember('guild1', 'user1');
    expect(member).not.toBeNull();
    expect(member!.verified).toBe(1);
    expect(member!.roles).toBe('Dev');
  });

  it('logs an audit entry', () => {
    db.logAudit('role_assign', 'user1', 'Assigned Dev role');
    const logs = db.getAuditLog(10);
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('role_assign');
  });
});
