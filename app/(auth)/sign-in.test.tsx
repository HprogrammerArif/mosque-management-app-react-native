import { render, fireEvent, waitFor } from '@testing-library/react-native';
import '../../src/i18n';
import SignIn from './sign-in';
import { api } from '../../src/stores/session';
import { ApiError } from '../../src/api/client';

jest.mock('../../src/stores/session', () => {
  const actual = jest.requireActual('../../src/stores/session');
  return { ...actual, api: { post: jest.fn(), get: jest.fn() } };
});

describe('SignIn', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('submits the identifier and password', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      accessToken: 'a', refreshToken: 'rt_b', expiresIn: 900,
      user: { id: 'u1', displayName: 'Kamal', locale: 'bn', phone: '+8801712345678', email: null },
    });

    const { getByLabelText, getByRole } = render(<SignIn />);
    fireEvent.changeText(getByLabelText('Phone number or email'), '+8801712345678');
    fireEvent.changeText(getByLabelText('Password'), 'correct-horse-battery');
    fireEvent.press(getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', expect.objectContaining({
        identifier: '+8801712345678', password: 'correct-horse-battery',
      }));
    });
  });

  it('shows translated copy for a credentials failure, not the server message', async () => {
    (api.post as jest.Mock).mockRejectedValue(
      new ApiError('AUTH_INVALID_CREDENTIALS', 401, 'raw server text'),
    );

    const { getByLabelText, getByRole, findByText, queryByText } = render(<SignIn />);
    fireEvent.changeText(getByLabelText('Phone number or email'), '+8801712345678');
    fireEvent.changeText(getByLabelText('Password'), 'wrong');
    fireEvent.press(getByRole('button', { name: 'Sign in' }));

    expect(await findByText('Phone, email or password is incorrect')).toBeTruthy();
    expect(queryByText('raw server text')).toBeNull();
  });

  it('shows an offline-aware message when the network is unavailable', async () => {
    (api.post as jest.Mock).mockRejectedValue(
      new ApiError('NETWORK_UNAVAILABLE', 0, 'Could not reach the server'),
    );

    const { getByLabelText, getByRole, findByText } = render(<SignIn />);
    fireEvent.changeText(getByLabelText('Phone number or email'), '+8801712345678');
    fireEvent.changeText(getByLabelText('Password'), 'correct-horse-battery');
    fireEvent.press(getByRole('button', { name: 'Sign in' }));

    expect(await findByText(/check your connection/i)).toBeTruthy();
  });
});
