import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { eq } from 'drizzle-orm';
import { useStyles } from '../../theme/use-styles';
import { useTheme } from '../../theme/ThemeProvider';
import type { Theme } from '../../theme/tokens';
import { openDb } from '../../data/db';
import { outbox } from '../../data/schema';
import { runSync } from '../../data/sync-engine';
import { api } from '../../stores/session';
import { useMosque } from '../../stores/mosque';

const badgeStyles = (t: Theme) => ({
  pill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: t.space[2],
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
  },
  synced: {
    borderColor: t.color.verdigris,
    backgroundColor: t.color.surface,
  },
  pending: {
    borderColor: t.color.ochre,
    backgroundColor: t.color.surface,
  },
  offline: {
    borderColor: t.color.brick,
    backgroundColor: t.color.surface,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotSynced: { backgroundColor: t.color.verdigris },
  dotPending: { backgroundColor: t.color.ochre },
  dotOffline: { backgroundColor: t.color.brick },
  text: {
    ...t.type.caption,
    fontFamily: t.font.ledger,
    fontSize: 11,
    color: t.color.ink,
  },
});

export function SyncBadge() {
  const s = useStyles(badgeStyles);
  const theme = useTheme();
  const mosqueId = useMosque((state) => state.currentMosqueId);

  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const db = await openDb();
      const rows = await db.select().from(outbox).where(eq(outbox.status, 'pending'));
      setPendingCount(rows.length);
    } catch {
      // Ignore if db is initialising
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void checkStatus(); }, 0);
    const interval = setInterval(() => { void checkStatus(); }, 5000);

    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnline(state.isConnected === true && state.isInternetReachable !== false);
    });

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      unsubscribe();
    };
  }, [checkStatus]);

  const handleManualSync = async () => {
    if (mosqueId === null || syncing || !online) return;
    setSyncing(true);
    try {
      await runSync(api, mosqueId);
      await checkStatus();
    } catch (err) {
      console.warn('[SyncBadge] Manual sync error:', err);
    } finally {
      setSyncing(false);
    }
  };

  if (!online) {
    return (
      <View style={[s.pill, s.offline]}>
        <View style={[s.dot, s.dotOffline]} />
        <Text style={s.text}>Offline</Text>
      </View>
    );
  }

  if (syncing) {
    return (
      <View style={[s.pill, s.pending]}>
        <ActivityIndicator size="small" color={theme.color.ochre} />
        <Text style={s.text}>Syncing...</Text>
      </View>
    );
  }

  if (pendingCount > 0) {
    return (
      <Pressable style={[s.pill, s.pending]} onPress={handleManualSync}>
        <View style={[s.dot, s.dotPending]} />
        <Text style={s.text}>{pendingCount} Pending</Text>
      </Pressable>
    );
  }

  return (
    <Pressable style={[s.pill, s.synced]} onPress={handleManualSync}>
      <View style={[s.dot, s.dotSynced]} />
      <Text style={s.text}>Synced</Text>
    </Pressable>
  );
}
