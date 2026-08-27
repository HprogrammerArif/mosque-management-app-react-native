import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { ApiClient } from '../api/client';

const TOKENS_KEY = 'tokens';
const USER_KEY = 'user';

type Tokens = { accessToken: string; refreshToken: string };
export type User = { id: string; displayName: string; locale: string;
                     phone: string | null; email: string | null };
export type AuthResponse = { accessToken: string; refreshToken: string;
                             expiresIn: number; user: User };
type Status = 'loading' | 'authenticated' | 'unauthenticated';

type SessionState = {
  user: User | null;
  status: Status;
  hydrate: () => Promise<void>;
  signIn: (response: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useSession = create<SessionState>((set) => ({
  user: null,
  status: 'loading',

  // Reads local storage only — never the network. This is why launch is instant offline.
  hydrate: async () => {
    const [tokens, user] = await Promise.all([
      SecureStore.getItemAsync(TOKENS_KEY),
      SecureStore.getItemAsync(USER_KEY),
    ]);
    set(tokens !== null && user !== null
      ? { user: JSON.parse(user) as User, status: 'authenticated' }
      : { user: null, status: 'unauthenticated' });
  },

  signIn: async (response) => {
    const tokens: Tokens = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    };
    await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user));
    set({ user: response.user, status: 'authenticated' });
  },

  signOut: async () => {
    await SecureStore.deleteItemAsync(TOKENS_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    set({ user: null, status: 'unauthenticated' });
  },
}));

async function currentAccessToken(): Promise<string | null> {
  const raw = await SecureStore.getItemAsync(TOKENS_KEY);
  return raw === null ? null : (JSON.parse(raw) as Tokens).accessToken;
}

export const api = new ApiClient(
  process.env['EXPO_PUBLIC_API_URL'] ?? 'http://10.0.2.2:3000',
  currentAccessToken,
);
