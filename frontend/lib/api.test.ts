import { tasksApi } from './api';
import { auth } from './auth';

jest.mock('./auth', () => ({
  auth: {
    getAccessToken: jest.fn(),
    refreshAccessToken: jest.fn(),
    clearTokens: jest.fn(),
  },
}));

function mockFetchSequence(responses: Array<{ status: number; body: unknown }>) {
  const fetchMock = jest.spyOn(global, 'fetch');
  responses.forEach(({ status, body }) => {
    fetchMock.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response);
  });
  return fetchMock;
}

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('tasksApi', () => {
  it('manda el access token en el header Authorization', async () => {
    (auth.getAccessToken as jest.Mock).mockReturnValue('mi-access-token');
    mockFetchSequence([{ status: 200, body: [] }]);

    await tasksApi.getAll();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/tasks'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mi-access-token',
        }),
      }),
    );
  });

  it('en un 401, renueva el token y reintenta la request una vez', async () => {
    (auth.getAccessToken as jest.Mock).mockReturnValue('token-vencido');
    (auth.refreshAccessToken as jest.Mock).mockResolvedValue('token-nuevo');

    mockFetchSequence([
      { status: 401, body: { message: 'Unauthorized' } },
      { status: 200, body: [{ id: 1, title: 'ok' }] },
    ]);

    const result = await tasksApi.getAll();

    expect(result).toEqual([{ id: 1, title: 'ok' }]);
    expect(global.fetch).toHaveBeenCalledTimes(2);

    // El segundo intento debe llevar el token nuevo, no el vencido
    const secondCallOptions = (global.fetch as jest.Mock).mock.calls[1][1];
    expect(secondCallOptions.headers.Authorization).toBe('Bearer token-nuevo');
  });

  it('si el refresh también falla, limpia los tokens y no reintenta', async () => {
    (auth.getAccessToken as jest.Mock).mockReturnValue('token-vencido');
    (auth.refreshAccessToken as jest.Mock).mockResolvedValue(null);

    mockFetchSequence([{ status: 401, body: { message: 'Unauthorized' } }]);

    await expect(tasksApi.getAll()).rejects.toThrow();

    expect(auth.clearTokens).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledTimes(1); // no reintenta sin token nuevo
  });
});
