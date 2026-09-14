import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './page';
import { auth } from '@/lib/auth';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: jest.fn() }),
}));

jest.mock('@/lib/auth', () => ({
  auth: {
    login: jest.fn(),
    saveTokens: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('LoginPage', () => {
  it('llama a auth.login con el email y contraseña ingresados, y redirige', async () => {
    (auth.login as jest.Mock).mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
      user: { id: 1, email: 'test@test.com' },
    });

    render(<LoginPage />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Email'), 'test@test.com');
    await user.type(screen.getByPlaceholderText('Contraseña'), '123456');
    await user.click(screen.getByRole('button', { name: /ingresar/i }));

    await waitFor(() => {
      expect(auth.login).toHaveBeenCalledWith('test@test.com', '123456');
    });
    expect(auth.saveTokens).toHaveBeenCalledWith('a', 'r');
    expect(pushMock).toHaveBeenCalledWith('/');
  });

  it('muestra el mensaje de error si el login falla', async () => {
    (auth.login as jest.Mock).mockRejectedValue(
      new Error('Credenciales inválidas'),
    );

    render(<LoginPage />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Email'), 'test@test.com');
    await user.type(screen.getByPlaceholderText('Contraseña'), 'mal');
    await user.click(screen.getByRole('button', { name: /ingresar/i }));

    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
