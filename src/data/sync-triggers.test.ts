import { renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useMosque } from '../stores/mosque';
import { runSync } from './sync-engine';
import { useSyncTriggers } from './sync-triggers';

jest.mock('./sync-engine', () => ({ runSync: jest.fn().mockResolvedValue(undefined) }));

const mockedRunSync = runSync as jest.MockedFunction<typeof runSync>;

/**
 * These exercise the coordination logic (in-flight guard, connectivity-transition
 * detection, reading the active mosque) with AppState/NetInfo's `addEventListener`
 * spied on directly — captured callbacks are invoked manually to simulate a
 * foreground/reconnect event. What they do NOT prove is that the real native AppState
 * and NetInfo modules actually fire these events correctly on real iOS/Android hardware
 * — see sync-triggers.ts's own doc comment for that boundary.
 */
describe('useSyncTriggers', () => {
  let appStateHandler: ((state: AppStateStatus) => void) | undefined;
  let netInfoHandler: ((state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => void) | undefined;

  beforeEach(() => {
    mockedRunSync.mockClear();
    useMosque.setState({ currentMosqueId: null });

    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => {
      appStateHandler = handler as (state: AppStateStatus) => void;
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
    jest.spyOn(NetInfo, 'addEventListener').mockImplementation((handler) => {
      netInfoHandler = handler as typeof netInfoHandler;
      return jest.fn();
    });
  });

  it('does nothing on mount — no mosque resolved yet', () => {
    renderHook(() => useSyncTriggers());
    expect(mockedRunSync).not.toHaveBeenCalled();
  });

  it('triggers a sync when the app becomes active, once a mosque is known', () => {
    useMosque.setState({ currentMosqueId: 'mosque-1' });
    renderHook(() => useSyncTriggers());

    appStateHandler?.('active');

    expect(mockedRunSync).toHaveBeenCalledTimes(1);
    expect(mockedRunSync.mock.calls[0]?.[1]).toBe('mosque-1');
  });

  it('does not trigger for a background/inactive transition', () => {
    useMosque.setState({ currentMosqueId: 'mosque-1' });
    renderHook(() => useSyncTriggers());

    appStateHandler?.('background');
    appStateHandler?.('inactive');

    expect(mockedRunSync).not.toHaveBeenCalled();
  });

  it('does not trigger on the connectivity listener\'s initial call, only on a real reconnect', () => {
    useMosque.setState({ currentMosqueId: 'mosque-1' });
    renderHook(() => useSyncTriggers());

    // First delivery — even if it reports "connected", this is not a transition FROM
    // disconnected, so it must not fire.
    netInfoHandler?.({ isConnected: true, isInternetReachable: true });
    expect(mockedRunSync).not.toHaveBeenCalled();

    netInfoHandler?.({ isConnected: false, isInternetReachable: false });
    expect(mockedRunSync).not.toHaveBeenCalled();

    // Now a genuine disconnected -> connected transition.
    netInfoHandler?.({ isConnected: true, isInternetReachable: true });
    expect(mockedRunSync).toHaveBeenCalledTimes(1);
  });

  it('treats isInternetReachable === false as not really connected', () => {
    useMosque.setState({ currentMosqueId: 'mosque-1' });
    renderHook(() => useSyncTriggers());

    netInfoHandler?.({ isConnected: true, isInternetReachable: false });
    netInfoHandler?.({ isConnected: true, isInternetReachable: true });

    // The first call establishes "not really connected" (isInternetReachable: false);
    // the second is the real transition into connectivity.
    expect(mockedRunSync).toHaveBeenCalledTimes(1);
  });

  it('never calls runSync while a mosque is null, even on a real reconnect', () => {
    renderHook(() => useSyncTriggers());

    netInfoHandler?.({ isConnected: false, isInternetReachable: false });
    netInfoHandler?.({ isConnected: true, isInternetReachable: true });
    appStateHandler?.('active');

    expect(mockedRunSync).not.toHaveBeenCalled();
  });

  it('removes both listeners on unmount', () => {
    const appStateRemove = jest.fn();
    const netInfoUnsubscribe = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockReturnValue(
      { remove: appStateRemove } as unknown as ReturnType<typeof AppState.addEventListener>,
    );
    jest.spyOn(NetInfo, 'addEventListener').mockReturnValue(netInfoUnsubscribe);

    const { unmount } = renderHook(() => useSyncTriggers());
    unmount();

    expect(appStateRemove).toHaveBeenCalledTimes(1);
    expect(netInfoUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
