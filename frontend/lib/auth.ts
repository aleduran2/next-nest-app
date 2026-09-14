const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const TOKEN_KEY = 'auth_token';

interface AuthResponse {
  accessToken: string;
  user: { id: number; email: string };
}

async function authRequest(path: string, email: string, password: string) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    // El backend responde { message: '...' } en los errores de Nest
    throw new Error(data.message ?? 'Error de autenticación');
  }

  return data as AuthResponse;
}

export const auth = {
  register: (email: string, password: string) =>
    authRequest('/auth/register', email, password),

  login: (email: string, password: string) =>
    authRequest('/auth/login', email, password),

  saveToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
  },
};
