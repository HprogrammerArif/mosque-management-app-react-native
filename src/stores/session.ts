import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { ApiClient } from '../api/client';
import { fetchMe } from '../api/auth';
import { applyAccountLocaleIfUnset } from '../i18n';
import { getDeviceId } from '../lib/device';

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
  /** Re-syncs memberships from GET /auth/me after an action that changes them (creating
   * a mosque, accepting an invitation) — see hasFeature's doc comment on why this was a
   * gap. Requires network; the caller already just made a live mutation, so it's on. */
  refreshMemberships: () => Promise<void>;
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
    if (tokens !== null && user !== null) {
      const parsedUser = JSON.parse(user) as User;
      set({
        user: parsedUser,
        memberships: memberships === null ? [] : JSON.parse(memberships) as Membership[],
        status: 'authenticated',
      });
      await applyAccountLocaleIfUnset(parsedUser.locale);
    } else {
      set({ user: null, memberships: [], status: 'unauthenticated' });
    }
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
    await applyAccountLocaleIfUnset(response.user.locale);
  },

  signOut: async () => {
    await SecureStore.deleteItemAsync(TOKENS_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    await SecureStore.deleteItemAsync(MEMBERSHIPS_KEY);
    set({ user: null, memberships: [], status: 'unauthenticated' });
  },

  refreshMemberships: async () => {
    const me = await fetchMe(api);
    await SecureStore.setItemAsync(MEMBERSHIPS_KEY, JSON.stringify(me.memberships));
    set({ memberships: me.memberships });
  },
}));

async function currentAccessToken(): Promise<string | null> {
  const raw = await SecureStore.getItemAsync(TOKENS_KEY);
  return raw === null ? null : (JSON.parse(raw) as Tokens).accessToken;
}

const LIVE_API_URL = 'https://backend-mosque-management-api.onrender.com';

let ongoingRefresh: Promise<string | null> | null = null;

async function attemptTokenRefresh(): Promise<string | null> {
  if (ongoingRefresh !== null) return ongoingRefresh;

  ongoingRefresh = (async () => {
    try {
      const raw = await SecureStore.getItemAsync(TOKENS_KEY);
      if (raw === null) return null;
      const tokens = JSON.parse(raw) as Tokens;
      if (!tokens.refreshToken) return null;

      const deviceId = await getDeviceId();
      const baseUrl = LIVE_API_URL;

      const response = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken, deviceId }),
      });

      if (!response.ok) return null;

      const data = await response.json() as { accessToken: string; refreshToken: string; expiresIn: number };
      const updatedTokens: Tokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };
      await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(updatedTokens));
      return data.accessToken;
    } catch {
      return null;
    } finally {
      ongoingRefresh = null;
    }
  })();

  return ongoingRefresh;
}

export const api = new ApiClient(
  LIVE_API_URL,
  currentAccessToken,
  () => {
    // When the server rejects credentials or active mosque membership (e.g. after a re-seed),
    // automatically clear the invalid session and transition to sign-in screen
    void useSession.getState().signOut();
  },
  attemptTokenRefresh,
);
