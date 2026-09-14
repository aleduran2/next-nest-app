import { Task } from '@/types/task';
import { auth } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = auth.getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });

  if (res.status === 401) {
    // Token vencido o inválido: mandamos al usuario a loguearse de nuevo
    auth.logout();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Sesión expirada');
  }

  if (!res.ok) {
    throw new Error(`Error ${res.status} llamando a ${path}`);
  }

  return res.json();
}

export const tasksApi = {
  getAll: () => request<Task[]>('/tasks'),
  create: (title: string) =>
    request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  toggleComplete: (id: number, isCompleted: boolean) =>
    request<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isCompleted }),
    }),
  remove: (id: number) =>
    request<{ deleted: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),
};
