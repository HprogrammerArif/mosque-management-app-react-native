import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { api } from '../stores/session';
import { useMosque } from '../stores/mosque';
import { runSync } from './sync-engine';

/**
 * Triggers a background sync when the app returns to the foreground or network
 * connectivity is restored, on top of the existing explicit-write and pull-to-refresh
 * triggers (donations/households screens) — closing the "reconnect/foreground-triggered
 * sync" gap named earlier in the build.
 *
 * Reads `mosqueId` fresh from the store inside each event callback (`getState()`, not a
 * subscribed value) rather than as a dependency — the listeners only need to be set up
 * once for the app's lifetime, and re-subscribing AppState/NetInfo every time the active
 * mosque changes would be pointless churn for something that changes at most a few times
 * per session (mosque switching doesn't exist yet regardless).
 *
 * **Not yet verified on a real device or emulator** — whether AppState actually fires
 * 'active' on every real backgrounding-then-foregrounding on iOS/Android, and whether
 * NetInfo's connectivity events fire promptly and accurately on real network hardware
 * (airplane mode, Wi-Fi-to-cellular handoff, a flaky connection), are exactly the kind of
 * thing a simulator can't stand in for. Deferred to the end-of-build device pass
 * (standing instruction), same category as SQLCipher's on-device verification gap in
 * db.ts. The listener wiring itself follows the documented APIs correctly; what's
 * unverified is their real-world firing behavior, not this code's logic.
 */
export function useSyncTriggers(): void {
  const inFlight = useRef(false);
  const wasConnected = useRef<boolean | null>(null);

  useEffect(() => {
    const trigger = () => {
      const mosqueId = useMosque.getState().currentMosqueId;
      if (mosqueId === null || inFlight.current) return;
      inFlight.current = true;
      void runSync(api, mosqueId)
        .catch((err) => console.warn('[useSyncTriggers] sync failed:', err))
        .finally(() => { inFlight.current = false; });
    };

    const appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') trigger();
    });

    // Fires once immediately with the current state (that first call is not a
    // reconnect — wasConnected.current starts null specifically to skip it) and again
    // on every subsequent change.
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const isConnected = state.isConnected === true && state.isInternetReachable !== false;
      if (isConnected && wasConnected.current === false) trigger();
      wasConnected.current = isConnected;
    });

    return () => {
      appStateSubscription.remove();
      unsubscribeNetInfo();
    };
  }, []);
}
