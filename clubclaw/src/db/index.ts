import BetterSqlite3 from 'better-sqlite3';
import { INIT_SQL } from './schema.js';

export interface MemberRow {
  guild_id: string;
  user_id: string;
  verified: number;
  roles: string;
  joined_at: string;
}

export interface AuditRow {
  id: number;
  action: string;
  user_id: string | null;
  details: string | null;
  created_at: string;
}

export interface Database {
  raw: BetterSqlite3.Database;
  upsertMember(guildId: string, userId: string, verified: boolean, roles: string[]): void;
  getMember(guildId: string, userId: string): MemberRow | null;
  logAudit(action: string, userId: string | null, details: string | null): void;
  getAuditLog(limit: number): AuditRow[];
  close(): void;
}

export function createDatabase(dbPath: string): Database {
  const raw = new BetterSqlite3(dbPath);
  raw.pragma('journal_mode = WAL');
  raw.exec(INIT_SQL);

  return {
    raw,

    upsertMember(guildId, userId, verified, roles) {
      raw
        .prepare(
          `INSERT INTO members (guild_id, user_id, verified, roles)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(guild_id, user_id)
           DO UPDATE SET verified = excluded.verified, roles = excluded.roles`
        )
        .run(guildId, userId, verified ? 1 : 0, roles.join(','));
    },

    getMember(guildId, userId) {
      return (
        raw
          .prepare('SELECT * FROM members WHERE guild_id = ? AND user_id = ?')
          .get(guildId, userId) as MemberRow | undefined
      ) ?? null;
    },

    logAudit(action, userId, details) {
      raw
        .prepare('INSERT INTO audit_log (action, user_id, details) VALUES (?, ?, ?)')
        .run(action, userId, details);
    },

    getAuditLog(limit) {
      return raw
        .prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?')
        .all(limit) as AuditRow[];
    },

    close() {
      raw.close();
    },
  };
}
