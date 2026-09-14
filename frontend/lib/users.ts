import { auth } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface UserProfile {
  id: number;
  email: string;
  role: 'USER' | 'ADMIN';
  avatarUrl: string | null;
  createdAt: string;
}

export const usersApi = {
  async getMe(): Promise<UserProfile> {
    const res = await fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${auth.getAccessToken()}` },
    });
    if (!res.ok) throw new Error('No se pudo cargar el perfil');
    return res.json();
  },

  async uploadAvatar(file: File): Promise<UserProfile> {
    const formData = new FormData();
    formData.append('file', file);

    // OJO: sin Content-Type manual. El navegador arma el
    // multipart/form-data con el boundary correcto solo; si lo seteamos
    // a mano, el request queda mal formado y el backend no puede parsearlo.
    const res = await fetch(`${API_URL}/users/me/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.getAccessToken()}` },
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message ?? 'No se pudo subir el avatar');
    }
    return res.json();
  },
};

/** Convierte "/uploads/xxx.png" del backend en una URL absoluta usable en <img>. */
export function avatarSrc(avatarUrl: string | null): string | null {
  if (!avatarUrl) return null;
  return `${API_URL}${avatarUrl}`;
}
