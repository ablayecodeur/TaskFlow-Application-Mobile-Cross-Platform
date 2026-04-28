import { create } from 'zustand';
import { User, AuthTokens } from '../types';
import {
  saveUser,
  getStoredUser,
  deleteUser,
  updateTokens,
} from '../db/repositories/userRepository';
import { loginApi, registerApi, logoutApi, LoginCredentials, RegisterCredentials } from '../api/auth';

interface AuthStore {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (tokens: AuthTokens) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  initialize: async () => {
    try {
      const stored = await getStoredUser();
      if (stored) {
        set({
          user: stored.user,
          tokens: stored.tokens,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const { user, tokens } = await loginApi(credentials);
      await saveUser(user, tokens);
      set({ user, tokens, isAuthenticated: true, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  register: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const { user, tokens } = await registerApi(credentials);
      await saveUser(user, tokens);
      set({ user, tokens, isAuthenticated: true, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur d'inscription";
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    const { user, tokens } = get();
    set({ isLoading: true });
    try {
      if (tokens?.refreshToken) {
        await logoutApi(tokens.refreshToken).catch(() => {});
      }
      if (user) await deleteUser(user.id);
    } finally {
      set({ user: null, tokens: null, isAuthenticated: false, isLoading: false });
    }
  },

  setTokens: async (tokens) => {
    const { user } = get();
    if (user) {
      await updateTokens(user.id, tokens);
      set({ tokens });
    }
  },

  clearError: () => set({ error: null }),
}));
