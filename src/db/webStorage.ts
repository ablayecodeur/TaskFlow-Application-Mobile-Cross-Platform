/**
 * Web adapter — remplace expo-sqlite par localStorage.
 * Toutes les fonctions sont async pour être interchangeables avec les repositories SQLite.
 */
import { User, AuthTokens, Task, CreateTaskPayload, UpdateTaskPayload } from '../types';
import { generateId } from '../utils';

const KEY_USER = 'tf_user';
const KEY_TASKS = 'tf_tasks';

// ─── User ──────────────────────────────────────────────────────────────────

export async function webSaveUser(user: User, tokens: AuthTokens): Promise<void> {
  const data = { user, tokens, expiresAt: Date.now() + tokens.expiresIn * 1000 };
  localStorage.setItem(KEY_USER, JSON.stringify(data));
}

export async function webGetStoredUser(): Promise<{ user: User; tokens: AuthTokens } | null> {
  const raw = localStorage.getItem(KEY_USER);
  if (!raw) return null;
  try {
    const { user, tokens, expiresAt } = JSON.parse(raw);
    return {
      user,
      tokens: {
        ...tokens,
        expiresIn: Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)),
      },
    };
  } catch {
    return null;
  }
}

export async function webUpdateTokens(_userId: string, tokens: AuthTokens): Promise<void> {
  const stored = await webGetStoredUser();
  if (stored) await webSaveUser(stored.user, tokens);
}

export async function webDeleteUser(_userId: string): Promise<void> {
  localStorage.removeItem(KEY_USER);
  localStorage.removeItem(KEY_TASKS);
}

// ─── Tasks ─────────────────────────────────────────────────────────────────

function readTasks(): Task[] {
  try {
    return JSON.parse(localStorage.getItem(KEY_TASKS) ?? '[]') as Task[];
  } catch {
    return [];
  }
}

function writeTasks(tasks: Task[]): void {
  localStorage.setItem(KEY_TASKS, JSON.stringify(tasks));
}

export async function webCreateTask(userId: string, payload: CreateTaskPayload): Promise<Task> {
  const now = new Date().toISOString();
  const task: Task = {
    id: generateId(),
    userId,
    title: payload.title,
    description: payload.description,
    priority: payload.priority,
    status: 'pending',
    dueDate: payload.dueDate,
    tags: payload.tags ?? [],
    syncStatus: 'pending_create',
    createdAt: now,
    updatedAt: now,
  };
  writeTasks([task, ...readTasks()]);
  return task;
}

export async function webGetTasksByUser(userId: string): Promise<Task[]> {
  const order: Record<string, number> = { urgent: 1, high: 2, medium: 3, low: 4 };
  return readTasks()
    .filter((t) => t.userId === userId && t.syncStatus !== 'pending_delete')
    .sort((a, b) => (order[a.priority] ?? 4) - (order[b.priority] ?? 4));
}

export async function webGetTaskById(id: string): Promise<Task | null> {
  return readTasks().find((t) => t.id === id) ?? null;
}

export async function webUpdateTask(id: string, payload: UpdateTaskPayload): Promise<Task | null> {
  const tasks = readTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const existing = tasks[idx];
  const updated: Task = {
    ...existing,
    ...payload,
    tags: payload.tags ?? existing.tags,
    updatedAt: new Date().toISOString(),
    syncStatus: existing.syncStatus === 'synced' ? 'pending_update' : existing.syncStatus,
    completedAt:
      payload.status === 'completed'
        ? new Date().toISOString()
        : existing.completedAt,
  };
  tasks[idx] = updated;
  writeTasks(tasks);
  return updated;
}

export async function webMarkTaskForDeletion(id: string): Promise<void> {
  const tasks = readTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return;
  if (tasks[idx].syncStatus === 'pending_create') {
    writeTasks(tasks.filter((t) => t.id !== id));
  } else {
    tasks[idx] = { ...tasks[idx], syncStatus: 'pending_delete' };
    writeTasks(tasks);
  }
}

export async function webGetPendingTasks(userId: string): Promise<Task[]> {
  return readTasks().filter(
    (t) =>
      t.userId === userId &&
      ['pending_create', 'pending_update', 'pending_delete'].includes(t.syncStatus)
  );
}

export async function webMarkTaskSynced(id: string, serverId: string): Promise<void> {
  const tasks = readTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx !== -1) {
    tasks[idx] = { ...tasks[idx], syncStatus: 'synced', serverId };
    writeTasks(tasks);
  }
}

export async function webDeleteLocalTask(serverId: string): Promise<void> {
  writeTasks(readTasks().filter((t) => t.serverId !== serverId));
}

export async function webGetTaskStats(userId: string): Promise<{
  total: number; completed: number; pending: number; inProgress: number; overdue: number;
}> {
  const tasks = await webGetTasksByUser(userId);
  const now = new Date().toISOString();
  return {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    overdue: tasks.filter(
      (t) =>
        !['completed', 'cancelled'].includes(t.status) &&
        t.dueDate != null &&
        t.dueDate < now
    ).length,
  };
}
