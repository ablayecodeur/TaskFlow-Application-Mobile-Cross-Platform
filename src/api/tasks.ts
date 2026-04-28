import { apiClient } from './client';
import {
  ApiResponse,
  CreateTaskPayload,
  Task,
  UpdateTaskPayload,
} from '../types';

interface ServerTask {
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
}

export async function fetchTasksApi(): Promise<ServerTask[]> {
  const response = await apiClient.get<ApiResponse<ServerTask[]>>('/tasks');
  return response.data.data;
}

export async function createTaskApi(payload: CreateTaskPayload): Promise<ServerTask> {
  const response = await apiClient.post<ApiResponse<ServerTask>>('/tasks', payload);
  return response.data.data;
}

export async function updateTaskApi(
  serverId: string,
  payload: UpdateTaskPayload
): Promise<ServerTask> {
  const response = await apiClient.patch<ApiResponse<ServerTask>>(
    `/tasks/${serverId}`,
    payload
  );
  return response.data.data;
}

export async function deleteTaskApi(serverId: string): Promise<void> {
  await apiClient.delete(`/tasks/${serverId}`);
}
