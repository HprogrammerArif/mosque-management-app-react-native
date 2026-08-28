import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { ApiClient } from '../api/client';

const TOKENS_KEY = 'tokens';
const USER_KEY = 'user';
const MEMBERSHIPS_KEY = 'memberships';

type Tokens = { accessToken: string; refreshToken: string };
export type User = { id: string; displayName: string; locale: string;
                     phone: string | null; email: string | null };
export type Entitlements = {
  features: string[];
  limits: { adminUsers: number | null; members: number | null; historyMonths: number | null };
};
export type Membership = {
  mosqueId: string; mosqueName: string; role: string;
  plan: string | null; entitlements: Entitlements;
};
export type AuthResponse = { accessToken: string; refreshToken: string;
                             expiresIn: number; user: User; memberships: Membership[] };
type Status = 'loading' | 'authenticated' | 'unauthenticated';

type SessionState = {
  user: User | null;
  memberships: Membership[];
  status: Status;
  hydrate: () => Promise<void>;
  signIn: (response: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
};

/**
 * Entitlements read at login/register and cached here (FR-SUB-9) — gating stays correct
 * offline without a live call. Stale until the next sign-in; there is no background
 * refresh yet (named gap, same category as reconnect-triggered sync).
 */
export function hasFeature(memberships: Membership[], mosqueId: string, feature: string): boolean {
  return memberships.find((m) => m.mosqueId === mosqueId)?.entitlements.features.includes(feature) ?? false;
}

export const useSession = create<SessionState>((set) => ({
  user: null,
  memberships: [],
  status: 'loading',

  // Reads local storage only — never the network. This is why launch is instant offline.
  hydrate: async () => {
    const [tokens, user, memberships] = await Promise.all([
      SecureStore.getItemAsync(TOKENS_KEY),
      SecureStore.getItemAsync(USER_KEY),
      SecureStore.getItemAsync(MEMBERSHIPS_KEY),
    ]);
    set(tokens !== null && user !== null
      ? {
        user: JSON.parse(user) as User,
        memberships: memberships === null ? [] : JSON.parse(memberships) as Membership[],
        status: 'authenticated',
      }
      : { user: null, memberships: [], status: 'unauthenticated' });
  },

  signIn: async (response) => {
    const tokens: Tokens = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    };
    await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user));
    await SecureStore.setItemAsync(MEMBERSHIPS_KEY, JSON.stringify(response.memberships));
    set({ user: response.user, memberships: response.memberships, status: 'authenticated' });
  },

  signOut: async () => {
    await SecureStore.deleteItemAsync(TOKENS_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    await SecureStore.deleteItemAsync(MEMBERSHIPS_KEY);
    set({ user: null, memberships: [], status: 'unauthenticated' });
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
