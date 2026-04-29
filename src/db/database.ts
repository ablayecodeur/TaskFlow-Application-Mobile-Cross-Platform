import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, MIGRATIONS, SCHEMA_VERSION } from './schema';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;

  _db = await SQLite.openDatabaseAsync('taskflow.db');

  await _db.execAsync('PRAGMA journal_mode = WAL;');
  await _db.execAsync('PRAGMA foreign_keys = ON;');

  await initializeSchema(_db);

  return _db;
}

async function initializeSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(CREATE_TABLES_SQL);

  const versionRow = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
  );

  const currentVersion = versionRow?.version ?? 1;

  if (currentVersion < SCHEMA_VERSION) {
    await runMigrations(db, currentVersion);
  }
}

async function runMigrations(
  db: SQLite.SQLiteDatabase,
  fromVersion: number
): Promise<void> {
  for (let v = fromVersion + 1; v <= SCHEMA_VERSION; v++) {
    const migration = MIGRATIONS[v];
    if (migration) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(migration);
        await db.runAsync(
          'INSERT INTO schema_version (version) VALUES (?)',
          [v]
        );
      });
    }
  }

  if (fromVersion === 1) {
    await db.runAsync(
      'INSERT INTO schema_version (version) VALUES (?)',
      [SCHEMA_VERSION]
    );
  }
}

export async function closeDatabase(): Promise<void> {
  if (_db) {
    await _db.closeAsync();
    _db = null;
  }
}
