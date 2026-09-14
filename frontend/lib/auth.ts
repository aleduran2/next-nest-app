const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: number; email: string };
}

async function authRequest(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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
    authRequest('/auth/register', { email, password }),

  login: (email: string, password: string) =>
    authRequest('/auth/login', { email, password }),

  saveTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Pide un access token nuevo usando el refresh token guardado.
   * El backend rota el refresh token, así que también guardamos el nuevo.
   * Devuelve el access token nuevo, o null si el refresh falló (hay que
   * volver a loguearse).
   */
  async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        this.clearTokens();
        return null;
      }

      const data: AuthResponse = await res.json();
      this.saveTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch {
      this.clearTokens();
      return null;
    }
  },

  clearTokens() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  /** Avisa al backend que invalide el refresh token y limpia todo localmente. */
  async logout() {
    const accessToken = this.getAccessToken();
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
    } catch {
      // si el backend no responde, igual limpiamos la sesión local
    }
    this.clearTokens();
  },
};
