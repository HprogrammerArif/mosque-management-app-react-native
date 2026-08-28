import { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useStyles } from '../src/theme/use-styles';
import type { Theme } from '../src/theme/tokens';
import { useSession, api } from '../src/stores/session';
import { useMosque } from '../src/stores/mosque';
import { PrayerRail } from '../src/components/ui/PrayerRail';
import { PrayerTable } from '../src/components/ui/PrayerTable';
import { EmptyState } from '../src/components/ui/EmptyState';
import { Button } from '../src/components/ui/Button';
import { computePrayerTimes, type DayPrayerTimes } from '../src/lib/prayer-times';
import { listMyMosques } from '../src/api/mosques';
import {
  syncMosqueConfig, getAnyCachedMosque, getCachedMosque, getCachedPrayerConfig,
} from '../src/data/sync-mosque';
import { bootstrapIfNeeded } from '../src/data/sync-engine';

const indexStyles = (t: Theme) => ({
  fill: { flex: 1, backgroundColor: t.color.paper },
  scroll: { flex: 1, backgroundColor: t.color.paper },
  content: { padding: t.space[5], gap: t.space[6] },
  nav: { flexDirection: 'row' as const, gap: t.space[3] },
  navButton: { flex: 1 },
});

type MosqueSummary = { id: string; latitude: number; longitude: number };

/**
 * Resolves which mosque to show, offline-first: a cached row means an instant,
 * network-free answer on every launch after the first. Only hits the API when the local
 * database has never seen a mosque before (first launch since sign-in, or after a fresh
 * install) — and even then, only to discover the ID; the actual data sync follows after.
 */
async function resolveMosque(): Promise<MosqueSummary | null> {
  const cached = await getAnyCachedMosque();
  if (cached) return cached;

  const mine = await listMyMosques(api);
  const first = mine[0];
  if (!first) return null;

  await syncMosqueConfig(api, first.id);
  const synced = await getCachedMosque(first.id);
  return synced;
}

export default function Index() {
  const { t } = useTranslation();
  const s = useStyles(indexStyles);
  const status = useSession((state) => state.status);
  const hydrate = useSession((state) => state.hydrate);

  const [resolving, setResolving] = useState(true);
  const [mosque, setMosque] = useState<MosqueSummary | null>(null);
  const [times, setTimes] = useState<DayPrayerTimes | null>(null);
  const setCurrentMosqueId = useMosque((state) => state.setCurrentMosqueId);

  useEffect(() => { void hydrate(); }, [hydrate]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;

    (async () => {
      const resolved = await resolveMosque();
      if (cancelled) return;
      setMosque(resolved);
      setCurrentMosqueId(resolved?.id ?? null);
      setResolving(false);
      if (!resolved) return;

      const config = await getCachedPrayerConfig(resolved.id);
      if (cancelled || !config) return;
      setTimes(computePrayerTimes(config, resolved, new Date()));

      // Refresh in the background — the screen already has something to show.
      void syncMosqueConfig(api, resolved.id);
      // One-time seed of the sync engine's local tables (households/donations) — a
      // no-op after the first successful call (bootstrapIfNeeded checks sync_state).
      void bootstrapIfNeeded(api, resolved.id);
    })();

    return () => { cancelled = true; };
  }, [status, setCurrentMosqueId]);

  if (status === 'loading' || resolving) return <View style={s.fill} />;
  if (status === 'unauthenticated') return <Redirect href="/(auth)/sign-in" />;

  if (!mosque) {
    return <EmptyState message={t('home.noMosque')} />;
  }

  if (!times) return <View style={s.fill} />;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <PrayerRail times={times} size="hero" />
      <PrayerTable times={times} />
      <View style={s.nav}>
        <View style={s.navButton}>
          <Button label={t('nav.households')} variant="secondary" onPress={() => router.push('/households')} />
        </View>
        <View style={s.navButton}>
          <Button label={t('nav.donations')} variant="secondary" onPress={() => router.push('/donations')} />
        </View>
        <View style={s.navButton}>
          <Button label={t('nav.expenses')} variant="secondary" onPress={() => router.push('/expenses')} />
        </View>
      </View>
    </ScrollView>
  );
}
