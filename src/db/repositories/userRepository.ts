import { Platform } from 'react-native';
import { getDatabase } from '../database';
import {
  webSaveUser,
  webGetStoredUser,
  webUpdateTokens,
  webDeleteUser,
} from '../webStorage';
import { User, AuthTokens, UserRow } from '../../types';

const isWeb = Platform.OS === 'web';

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatar: row.avatar ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function saveUser(user: User, tokens: AuthTokens): Promise<void> {
  if (isWeb) return webSaveUser(user, tokens);

  const db = await getDatabase();
  const expiresAt = Date.now() + tokens.expiresIn * 1000;

  await db.runAsync(
    `INSERT INTO users (id, email, name, avatar, access_token, refresh_token, token_expires_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       email            = excluded.email,
       name             = excluded.name,
       avatar           = excluded.avatar,
       access_token     = excluded.access_token,
       refresh_token    = excluded.refresh_token,
       token_expires_at = excluded.token_expires_at,
       updated_at       = datetime('now')`,
    [user.id, user.email, user.name, user.avatar ?? null,
     tokens.accessToken, tokens.refreshToken, expiresAt]
  );
}

export async function getStoredUser(): Promise<{ user: User; tokens: AuthTokens } | null> {
  if (isWeb) return webGetStoredUser();

  const db = await getDatabase();
  const row = await db.getFirstAsync<UserRow>(
    'SELECT * FROM users ORDER BY updated_at DESC LIMIT 1'
  );
  if (!row) return null;

  return {
    user: rowToUser(row),
    tokens: {
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      expiresIn: Math.max(0, Math.floor((row.token_expires_at - Date.now()) / 1000)),
    },
  };
}

export async function updateTokens(userId: string, tokens: AuthTokens): Promise<void> {
  if (isWeb) return webUpdateTokens(userId, tokens);

  const db = await getDatabase();
  const expiresAt = Date.now() + tokens.expiresIn * 1000;
  await db.runAsync(
    `UPDATE users SET access_token = ?, refresh_token = ?, token_expires_at = ?, updated_at = datetime('now') WHERE id = ?`,
    [tokens.accessToken, tokens.refreshToken, expiresAt, userId]
  );
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<User, 'name' | 'avatar'>>
): Promise<void> {
  if (isWeb) {
    const stored = await webGetStoredUser();
    if (stored) await webSaveUser({ ...stored.user, ...updates }, stored.tokens);
    return;
  }

  const db = await getDatabase();
  const fields: string[] = [];
  const values: (string | null)[] = [];

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.avatar !== undefined) { fields.push('avatar = ?'); values.push(updates.avatar ?? null); }
  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(userId);
  await db.runAsync(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteUser(userId: string): Promise<void> {
  if (isWeb) return webDeleteUser(userId);

  const db = await getDatabase();
  await db.runAsync('DELETE FROM users WHERE id = ?', [userId]);
}
