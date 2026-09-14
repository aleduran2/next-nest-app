import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from './page';
import { auth } from '@/lib/auth';
import { tasksApi } from '@/lib/api';

const replaceMock = jest.fn();
const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

jest.mock('@/lib/auth', () => ({
  auth: {
    getAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
    logout: jest.fn(),
  },
}));

jest.mock('@/lib/api', () => ({
  tasksApi: {
    getAll: jest.fn(),
    create: jest.fn(),
    toggleComplete: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock('@/lib/users', () => ({
  usersApi: {
    getMe: jest.fn().mockResolvedValue({
      id: 1,
      email: 'test@test.com',
      role: 'USER',
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    }),
    uploadAvatar: jest.fn(),
  },
  avatarSrc: (url: string | null) => url,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('HomePage', () => {
  it('redirige a /login si no hay ningún token guardado', async () => {
    (auth.getAccessToken as jest.Mock).mockReturnValue(null);
    (auth.getRefreshToken as jest.Mock).mockReturnValue(null);

    render(<HomePage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/login');
    });
    // Si no hay sesión, ni siquiera debería intentar pedir las tareas
    expect(tasksApi.getAll).not.toHaveBeenCalled();
  });

  it('carga y muestra las tareas cuando hay sesión activa', async () => {
    (auth.getAccessToken as jest.Mock).mockReturnValue('token');
    (auth.getRefreshToken as jest.Mock).mockReturnValue('refresh');
    (tasksApi.getAll as jest.Mock).mockResolvedValue([
      { id: 1, title: 'Aprender testing', isCompleted: false },
    ]);

    render(<HomePage />);

    expect(await screen.findByText('Aprender testing')).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('muestra un mensaje de error si falla la carga de tareas', async () => {
    (auth.getAccessToken as jest.Mock).mockReturnValue('token');
    (auth.getRefreshToken as jest.Mock).mockReturnValue('refresh');
    (tasksApi.getAll as jest.Mock).mockRejectedValue(new Error('network'));

    render(<HomePage />);

    expect(
      await screen.findByText(/no se pudo conectar con el backend/i),
    ).toBeInTheDocument();
  });

  it('crea una tarea nueva al enviar el formulario', async () => {
    (auth.getAccessToken as jest.Mock).mockReturnValue('token');
    (auth.getRefreshToken as jest.Mock).mockReturnValue('refresh');
    (tasksApi.getAll as jest.Mock).mockResolvedValue([]);
    (tasksApi.create as jest.Mock).mockResolvedValue({
      id: 2,
      title: 'Nueva tarea',
      isCompleted: false,
    });

    render(<HomePage />);
    await waitFor(() => expect(tasksApi.getAll).toHaveBeenCalled());

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Nueva tarea...'), 'Nueva tarea');
    await user.click(screen.getByRole('button', { name: /agregar/i }));

    expect(tasksApi.create).toHaveBeenCalledWith('Nueva tarea');
    expect(await screen.findByText('Nueva tarea')).toBeInTheDocument();
  });

  it('cierra sesión y redirige al login', async () => {
    (auth.getAccessToken as jest.Mock).mockReturnValue('token');
    (auth.getRefreshToken as jest.Mock).mockReturnValue('refresh');
    (tasksApi.getAll as jest.Mock).mockResolvedValue([]);

    render(<HomePage />);
    await waitFor(() => expect(tasksApi.getAll).toHaveBeenCalled());

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /cerrar sesión/i }));

    await waitFor(() => {
      expect(auth.logout).toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith('/login');
    });
  });
});
