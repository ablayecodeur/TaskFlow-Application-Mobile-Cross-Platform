import { apiClient } from './client';
import { ApiResponse, AuthTokens, LoginCredentials, RegisterCredentials, User } from '../types';

export interface AuthResponseData {
  user: User;
  tokens: AuthTokens;
}

export async function loginApi(credentials: LoginCredentials): Promise<AuthResponseData> {
  const response = await apiClient.post<ApiResponse<AuthResponseData>>(
    '/auth/login',
    credentials
  );
  return response.data.data;
}

export async function registerApi(credentials: RegisterCredentials): Promise<AuthResponseData> {
  const response = await apiClient.post<ApiResponse<AuthResponseData>>(
    '/auth/register',
    credentials
  );
  return response.data.data;
}

export async function logoutApi(refreshToken: string): Promise<void> {
  await apiClient.post('/auth/logout', { refreshToken });
}

export async function getMeApi(): Promise<User> {
  const response = await apiClient.get<ApiResponse<User>>('/auth/me');
  return response.data.data;
}

export async function updateProfileApi(
  updates: Partial<Pick<User, 'name' | 'avatar'>>
): Promise<User> {
  const response = await apiClient.patch<ApiResponse<User>>('/auth/me', updates);
  return response.data.data;
}

export async function changePasswordApi(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await apiClient.post('/auth/change-password', payload);
}
