import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from './page';
import { auth } from '@/lib/auth';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: jest.fn() }),
}));

jest.mock('@/lib/auth', () => ({
  auth: {
    register: jest.fn(),
    saveTokens: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RegisterPage', () => {
  it('registra al usuario y redirige a la home', async () => {
    (auth.register as jest.Mock).mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
      user: { id: 1, email: 'nuevo@test.com' },
    });

    render(<RegisterPage />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Email'), 'nuevo@test.com');
    await user.type(
      screen.getByPlaceholderText(/Contraseña \(mín/i),
      '123456',
    );
    await user.click(screen.getByRole('button', { name: /registrarme/i }));

    await waitFor(() => {
      expect(auth.register).toHaveBeenCalledWith('nuevo@test.com', '123456');
    });
    expect(auth.saveTokens).toHaveBeenCalledWith('a', 'r');
    expect(pushMock).toHaveBeenCalledWith('/');
  });

  it('muestra el error si el email ya está registrado', async () => {
    (auth.register as jest.Mock).mockRejectedValue(
      new Error('Ese email ya está registrado'),
    );

    render(<RegisterPage />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Email'), 'repetido@test.com');
    await user.type(
      screen.getByPlaceholderText(/Contraseña \(mín/i),
      '123456',
    );
    await user.click(screen.getByRole('button', { name: /registrarme/i }));

    expect(
      await screen.findByText('Ese email ya está registrado'),
    ).toBeInTheDocument();
  });
});
