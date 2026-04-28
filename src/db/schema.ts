export const SCHEMA_VERSION = 3;

export const CREATE_TABLES_SQL = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    avatar          TEXT,
    access_token    TEXT NOT NULL,
    refresh_token   TEXT NOT NULL,
    token_expires_at INTEGER NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id           TEXT PRIMARY KEY NOT NULL,
    user_id      TEXT NOT NULL,
    server_id    TEXT,
    title        TEXT NOT NULL,
    description  TEXT,
    priority     TEXT NOT NULL DEFAULT 'medium'
                   CHECK(priority IN ('low','medium','high','urgent')),
    status       TEXT NOT NULL DEFAULT 'pending'
                   CHECK(status IN ('pending','in_progress','completed','cancelled')),
    due_date     TEXT,
    completed_at TEXT,
    tags         TEXT NOT NULL DEFAULT '[]',
    sync_status  TEXT NOT NULL DEFAULT 'pending_create'
                   CHECK(sync_status IN ('synced','pending_create','pending_update','pending_delete')),
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id           TEXT PRIMARY KEY NOT NULL,
    user_id      TEXT NOT NULL,
    type         TEXT NOT NULL,
    title        TEXT NOT NULL,
    body         TEXT NOT NULL,
    data         TEXT NOT NULL DEFAULT '{}',
    scheduled_at TEXT,
    read_at      TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_user_id    ON tasks(user_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_status     ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_sync_status ON tasks(sync_status);
  CREATE INDEX IF NOT EXISTS idx_tasks_due_date   ON tasks(due_date);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
`;

export const MIGRATIONS: Record<number, string> = {
  2: `
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS server_id TEXT;
  `,
  3: `
    CREATE TABLE IF NOT EXISTS notifications (
      id           TEXT PRIMARY KEY NOT NULL,
      user_id      TEXT NOT NULL,
      type         TEXT NOT NULL,
      title        TEXT NOT NULL,
      body         TEXT NOT NULL,
      data         TEXT NOT NULL DEFAULT '{}',
      scheduled_at TEXT,
      read_at      TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
  `,
};
