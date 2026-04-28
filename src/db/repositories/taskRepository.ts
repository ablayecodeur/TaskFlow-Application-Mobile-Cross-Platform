import { getDatabase } from '../database';
import {
  Task,
  TaskRow,
  CreateTaskPayload,
  UpdateTaskPayload,
  SyncStatus,
  TaskStatus,
} from '../../types';
import { generateId } from '../../utils';

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    userId: row.user_id,
    serverId: row.server_id ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    priority: row.priority as Task['priority'],
    status: row.status as TaskStatus,
    dueDate: row.due_date ?? undefined,
    completedAt: row.completed_at ?? undefined,
    tags: JSON.parse(row.tags) as string[],
    syncStatus: row.sync_status as SyncStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createTask(
  userId: string,
  payload: CreateTaskPayload
): Promise<Task> {
  const db = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO tasks (id, user_id, title, description, priority, due_date, tags, sync_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_create', ?, ?)`,
    [
      id,
      userId,
      payload.title,
      payload.description ?? null,
      payload.priority,
      payload.dueDate ?? null,
      JSON.stringify(payload.tags ?? []),
      now,
      now,
    ]
  );

  const row = await db.getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE id = ?', [id]);
  return rowToTask(row!);
}

export async function getTasksByUser(userId: string): Promise<Task[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TaskRow>(
    `SELECT * FROM tasks
     WHERE user_id = ? AND sync_status != 'pending_delete'
     ORDER BY
       CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
       due_date ASC NULLS LAST,
       created_at DESC`,
    [userId]
  );
  return rows.map(rowToTask);
}

export async function getTaskById(id: string): Promise<Task | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE id = ?', [id]);
  return row ? rowToTask(row) : null;
}

export async function updateTask(
  id: string,
  payload: UpdateTaskPayload
): Promise<Task | null> {
  const db = await getDatabase();

  const existing = await db.getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE id = ?', [id]);
  if (!existing) return null;

  const fields: string[] = ["updated_at = datetime('now')"];
  const values: (string | null)[] = [];

  if (payload.title !== undefined) { fields.push('title = ?'); values.push(payload.title); }
  if (payload.description !== undefined) { fields.push('description = ?'); values.push(payload.description ?? null); }
  if (payload.priority !== undefined) { fields.push('priority = ?'); values.push(payload.priority); }
  if (payload.status !== undefined) {
    fields.push('status = ?');
    values.push(payload.status);
    if (payload.status === 'completed') {
      fields.push("completed_at = datetime('now')");
    }
  }
  if (payload.dueDate !== undefined) { fields.push('due_date = ?'); values.push(payload.dueDate ?? null); }
  if (payload.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(payload.tags)); }

  if (existing.sync_status === 'synced') {
    fields.push("sync_status = 'pending_update'");
  }

  values.push(id);

  await db.runAsync(
    `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  const updated = await db.getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE id = ?', [id]);
  return updated ? rowToTask(updated) : null;
}

export async function markTaskForDeletion(id: string): Promise<void> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<TaskRow>('SELECT sync_status FROM tasks WHERE id = ?', [id]);

  if (!row) return;

  if (row.sync_status === 'pending_create') {
    await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
  } else {
    await db.runAsync(
      "UPDATE tasks SET sync_status = 'pending_delete', updated_at = datetime('now') WHERE id = ?",
      [id]
    );
  }
}

export async function getPendingTasks(userId: string): Promise<Task[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TaskRow>(
    `SELECT * FROM tasks
     WHERE user_id = ? AND sync_status IN ('pending_create', 'pending_update', 'pending_delete')`,
    [userId]
  );
  return rows.map(rowToTask);
}

export async function markTaskSynced(id: string, serverId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE tasks SET sync_status = 'synced', server_id = ?, updated_at = datetime('now') WHERE id = ?",
    [serverId, id]
  );
}

export async function upsertTaskFromServer(serverTask: {
  id: string;
  userId: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  dueDate?: string;
  completedAt?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}): Promise<void> {
  const db = await getDatabase();

  const existing = await db.getFirstAsync<TaskRow>(
    'SELECT * FROM tasks WHERE server_id = ?',
    [serverTask.id]
  );

  if (existing) {
    if (existing.sync_status === 'synced') {
      await db.runAsync(
        `UPDATE tasks SET
          title = ?, description = ?, priority = ?, status = ?,
          due_date = ?, completed_at = ?, tags = ?, updated_at = ?
         WHERE server_id = ?`,
        [
          serverTask.title,
          serverTask.description ?? null,
          serverTask.priority,
          serverTask.status,
          serverTask.dueDate ?? null,
          serverTask.completedAt ?? null,
          JSON.stringify(serverTask.tags),
          serverTask.updatedAt,
          serverTask.id,
        ]
      );
    }
  } else {
    const localId = generateId();
    await db.runAsync(
      `INSERT INTO tasks (id, user_id, server_id, title, description, priority, status, due_date, completed_at, tags, sync_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)`,
      [
        localId,
        serverTask.userId,
        serverTask.id,
        serverTask.title,
        serverTask.description ?? null,
        serverTask.priority,
        serverTask.status,
        serverTask.dueDate ?? null,
        serverTask.completedAt ?? null,
        JSON.stringify(serverTask.tags),
        serverTask.createdAt,
        serverTask.updatedAt,
      ]
    );
  }
}

export async function deleteLocalTask(serverId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM tasks WHERE server_id = ?', [serverId]);
}

export async function getTaskStats(userId: string): Promise<{
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  overdue: number;
}> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const row = await db.getFirstAsync<{
    total: number;
    completed: number;
    pending: number;
    in_progress: number;
    overdue: number;
  }>(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status NOT IN ('completed','cancelled') AND due_date < ? THEN 1 ELSE 0 END) as overdue
     FROM tasks
     WHERE user_id = ? AND sync_status != 'pending_delete'`,
    [now, userId]
  );

  return {
    total: row?.total ?? 0,
    completed: row?.completed ?? 0,
    pending: row?.pending ?? 0,
    inProgress: row?.in_progress ?? 0,
    overdue: row?.overdue ?? 0,
  };
}
