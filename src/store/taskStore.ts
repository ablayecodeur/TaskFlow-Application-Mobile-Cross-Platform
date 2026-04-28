import { create } from 'zustand';
import { Task, CreateTaskPayload, UpdateTaskPayload, TaskStatus } from '../types';
import {
  createTask,
  getTasksByUser,
  updateTask,
  markTaskForDeletion,
  getTaskStats,
} from '../db/repositories/taskRepository';

interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  overdue: number;
}

interface TaskStore {
  tasks: Task[];
  stats: TaskStats;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  filter: 'all' | TaskStatus;
  searchQuery: string;

  loadTasks: (userId: string) => Promise<void>;
  addTask: (userId: string, payload: CreateTaskPayload) => Promise<Task>;
  editTask: (id: string, payload: UpdateTaskPayload) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  setFilter: (filter: 'all' | TaskStatus) => void;
  setSearchQuery: (query: string) => void;
  setSyncing: (value: boolean) => void;
  refreshStats: (userId: string) => Promise<void>;
  clearError: () => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  stats: { total: 0, completed: 0, pending: 0, inProgress: 0, overdue: 0 },
  isLoading: false,
  isSyncing: false,
  error: null,
  filter: 'all',
  searchQuery: '',

  loadTasks: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const [tasks, stats] = await Promise.all([
        getTasksByUser(userId),
        getTaskStats(userId),
      ]);
      set({ tasks, stats, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de chargement';
      set({ error: message, isLoading: false });
    }
  },

  addTask: async (userId, payload) => {
    const task = await createTask(userId, payload);
    set((s) => ({
      tasks: [task, ...s.tasks],
      stats: { ...s.stats, total: s.stats.total + 1, pending: s.stats.pending + 1 },
    }));
    return task;
  },

  editTask: async (id, payload) => {
    const updated = await updateTask(id, payload);
    if (!updated) return;
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? updated : t)),
    }));
  },

  removeTask: async (id) => {
    await markTaskForDeletion(id);
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== id),
      stats: { ...s.stats, total: Math.max(0, s.stats.total - 1) },
    }));
  },

  toggleComplete: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;

    const newStatus: TaskStatus =
      task.status === 'completed' ? 'pending' : 'completed';
    const updated = await updateTask(id, { status: newStatus });
    if (!updated) return;

    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? updated : t)),
      stats: {
        ...s.stats,
        completed: s.stats.completed + (newStatus === 'completed' ? 1 : -1),
        pending: s.stats.pending + (newStatus === 'pending' ? 1 : -1),
      },
    }));
  },

  setFilter: (filter) => set({ filter }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setSyncing: (isSyncing) => set({ isSyncing }),

  refreshStats: async (userId) => {
    const stats = await getTaskStats(userId);
    set({ stats });
  },

  clearError: () => set({ error: null }),
}));

export function selectFilteredTasks(state: TaskStore): Task[] {
  const { tasks, filter, searchQuery } = state;

  let result = tasks;

  if (filter !== 'all') {
    result = result.filter((t) => t.status === filter);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    result = result.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }

  return result;
}
