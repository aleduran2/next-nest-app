import { Task } from '@/types/task';
import { auth } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function rawFetch(path: string, options: RequestInit, token: string | null) {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res = await rawFetch(path, options, auth.getAccessToken());

  if (res.status === 401) {
    // El access token venció: intentamos renovarlo con el refresh token
    // y reintentamos la request UNA vez con el token nuevo.
    const newAccessToken = await auth.refreshAccessToken();

    if (!newAccessToken) {
      auth.clearTokens();
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new Error('Sesión expirada');
    }

    res = await rawFetch(path, options, newAccessToken);
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
