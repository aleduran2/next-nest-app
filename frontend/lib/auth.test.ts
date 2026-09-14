import { auth } from './auth';

// jsdom (el entorno de test) ya trae un localStorage real en memoria,
// así que no hace falta mockearlo: solo lo limpiamos entre tests.
beforeEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

function mockFetchOnce(body: unknown, ok = true, status = ok ? 200 : 401) {
  return jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok,
    status,
    json: async () => body,
  } as Response);
}

describe('auth.saveTokens / getAccessToken / getRefreshToken', () => {
  it('guarda y devuelve ambos tokens', () => {
    auth.saveTokens('access-123', 'refresh-456');

    expect(auth.getAccessToken()).toBe('access-123');
    expect(auth.getRefreshToken()).toBe('refresh-456');
  });

  it('clearTokens borra ambos', () => {
    auth.saveTokens('access-123', 'refresh-456');
    auth.clearTokens();

    expect(auth.getAccessToken()).toBeNull();
    expect(auth.getRefreshToken()).toBeNull();
  });
});

describe('auth.login', () => {
  it('devuelve los tokens cuando el backend responde ok', async () => {
    mockFetchOnce({
      accessToken: 'a',
      refreshToken: 'r',
      user: { id: 1, email: 'test@test.com' },
    });

    const result = await auth.login('test@test.com', '123456');

    expect(result.accessToken).toBe('a');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('tira un error legible cuando el backend responde 401', async () => {
    mockFetchOnce({ message: 'Credenciales inválidas' }, false, 401);

    await expect(auth.login('test@test.com', 'mal')).rejects.toThrow(
      'Credenciales inválidas',
    );
  });
});

describe('auth.refreshAccessToken', () => {
  it('devuelve null si no hay refresh token guardado', async () => {
    const result = await auth.refreshAccessToken();
    expect(result).toBeNull();
  });

  it('renueva y guarda el par de tokens rotado', async () => {
    auth.saveTokens('access-vieja', 'refresh-vieja');
    mockFetchOnce({
      accessToken: 'access-nueva',
      refreshToken: 'refresh-nueva',
      user: { id: 1, email: 'test@test.com' },
    });

    const result = await auth.refreshAccessToken();

    expect(result).toBe('access-nueva');
    expect(auth.getAccessToken()).toBe('access-nueva');
    expect(auth.getRefreshToken()).toBe('refresh-nueva');
  });

  it('limpia los tokens y devuelve null si el refresh es rechazado', async () => {
    auth.saveTokens('access-vieja', 'refresh-vieja');
    mockFetchOnce({ message: 'Refresh token inválido' }, false, 401);

    const result = await auth.refreshAccessToken();

    expect(result).toBeNull();
    expect(auth.getAccessToken()).toBeNull();
    expect(auth.getRefreshToken()).toBeNull();
  });
});

describe('auth.logout', () => {
  it('limpia los tokens locales aunque el backend falle', async () => {
    auth.saveTokens('access', 'refresh');
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network error'));

    await auth.logout();

    expect(auth.getAccessToken()).toBeNull();
    expect(auth.getRefreshToken()).toBeNull();
  });
});
