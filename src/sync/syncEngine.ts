import NetInfo from '@react-native-community/netinfo';
import {
  getPendingTasks,
  markTaskSynced,
  deleteLocalTask,
  upsertTaskFromServer,
} from '../db/repositories/taskRepository';
import {
  createTaskApi,
  updateTaskApi,
  deleteTaskApi,
  fetchTasksApi,
} from '../api/tasks';
import { SyncResult, Task } from '../types';
import { useTaskStore } from '../store/taskStore';

const SYNC_DEBOUNCE_MS = 3_000;
let _syncTimer: ReturnType<typeof setTimeout> | null = null;
let _isSyncing = false;

export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable !== false;
}

export async function runSync(userId: string): Promise<SyncResult> {
  if (_isSyncing) return { created: 0, updated: 0, deleted: 0, conflicts: 0, errors: 0 };

  _isSyncing = true;
  useTaskStore.getState().setSyncing(true);

  const result: SyncResult = { created: 0, updated: 0, deleted: 0, conflicts: 0, errors: 0 };

  try {
    const online = await isOnline();
    if (!online) return result;

    // 1. Push local pending changes to server
    const pending = await getPendingTasks(userId);

    for (const task of pending) {
      try {
        await pushTask(task, result);
      } catch {
        result.errors++;
      }
    }

    // 2. Pull server state and merge locally
    const serverTasks = await fetchTasksApi();

    for (const serverTask of serverTasks) {
      await upsertTaskFromServer(serverTask);
    }

    // 3. Remove local tasks deleted on server
    const localTasks = useTaskStore.getState().tasks;
    const serverIds = new Set(serverTasks.map((t) => t.id));

    for (const local of localTasks) {
      if (local.serverId && !serverIds.has(local.serverId) && local.syncStatus === 'synced') {
        await deleteLocalTask(local.serverId);
        result.deleted++;
      }
    }

    // 4. Reload store
    await useTaskStore.getState().loadTasks(userId);

  } finally {
    _isSyncing = false;
    useTaskStore.getState().setSyncing(false);
  }

  return result;
}

async function pushTask(task: Task, result: SyncResult): Promise<void> {
  switch (task.syncStatus) {
    case 'pending_create': {
      const serverTask = await createTaskApi({
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
        tags: task.tags,
      });
      await markTaskSynced(task.id, serverTask.id);
      result.created++;
      break;
    }

    case 'pending_update': {
      if (!task.serverId) { result.errors++; break; }
      await updateTaskApi(task.serverId, {
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate,
        tags: task.tags,
      });
      await markTaskSynced(task.id, task.serverId);
      result.updated++;
      break;
    }

    case 'pending_delete': {
      if (!task.serverId) { result.errors++; break; }
      await deleteTaskApi(task.serverId);
      await deleteLocalTask(task.serverId);
      result.deleted++;
      break;
    }
  }
}

export function scheduleSync(userId: string, delayMs = SYNC_DEBOUNCE_MS): void {
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => runSync(userId), delayMs);
}

export function cancelScheduledSync(): void {
  if (_syncTimer) {
    clearTimeout(_syncTimer);
    _syncTimer = null;
  }
}
