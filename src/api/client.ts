import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { getStoredUser, updateTokens } from '../db/repositories/userRepository';
import { AuthTokens } from '../types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.taskflow.dev/v1';
const REQUEST_TIMEOUT = 15_000;

let _refreshPromise: Promise<AuthTokens> | null = null;

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Request interceptor — attach access token ──────────────────────────────

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const stored = await getStoredUser();
    if (stored?.tokens.accessToken) {
      config.headers.Authorization = `Bearer ${stored.tokens.accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor — handle 401 with token refresh ───────────────────

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(normalizeError(error));
    }

    originalRequest._retry = true;

    try {
      const newTokens = await refreshAccessToken();
      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${newTokens.accessToken}`,
      };
      return apiClient(originalRequest);
    } catch {
      return Promise.reject(normalizeError(error));
    }
  }
);

async function refreshAccessToken(): Promise<AuthTokens> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    const stored = await getStoredUser();
    if (!stored) throw new Error('No session');

    const response = await axios.post<{ data: AuthTokens }>(
      `${BASE_URL}/auth/refresh`,
      { refreshToken: stored.tokens.refreshToken },
      { timeout: REQUEST_TIMEOUT }
    );

    const newTokens = response.data.data;
    await updateTokens(stored.user.id, newTokens);
    return newTokens;
  })().finally(() => {
    _refreshPromise = null;
  });

  return _refreshPromise;
}

function normalizeError(error: unknown): Error & { status?: number; code?: string } {
  if (axios.isAxiosError(error)) {
    const normalized = new Error(
      error.response?.data?.message ?? error.message
    ) as Error & { status?: number; code?: string };
    normalized.status = error.response?.status;
    normalized.code = error.response?.data?.code ?? error.code;
    return normalized;
  }
  return error as Error;
}
