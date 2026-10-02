import { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useStyles } from '../src/theme/use-styles';
import type { Theme } from '../src/theme/tokens';
import { ApiError } from '../src/api/client';
import { useSession, api, type Membership } from '../src/stores/session';
import { useMosque } from '../src/stores/mosque';
import { PrayerRail } from '../src/components/ui/PrayerRail';
import { PrayerTable } from '../src/components/ui/PrayerTable';
import { EmptyState } from '../src/components/ui/EmptyState';
import { Button } from '../src/components/ui/Button';
import { computePrayerTimes, type DayPrayerTimes } from '../src/lib/prayer-times';
import { listMyMosques } from '../src/api/mosques';
import {
  syncMosqueConfig, getAnyCachedMosque, getCachedMosque, getCachedPrayerConfig,
  syncFunds, syncExpenseCategories,
} from '../src/data/sync-mosque';
import { bootstrapIfNeeded } from '../src/data/sync-engine';

const indexStyles = (t: Theme) => ({
  fill: { flex: 1, backgroundColor: t.color.paper },
  scroll: { flex: 1, backgroundColor: t.color.paper },
  content: { padding: t.space[5], gap: t.space[6] },
  nav: {
    flexDirection: 'row' as const, flexWrap: 'wrap' as const,
    columnGap: t.space[3], rowGap: t.space[3],
  },
  // Fixed two-column width, not `flex: 1` — with `flexWrap`, a `flex` child stretches to
  // fill whatever is left on its own wrapped row (a lone last button on an odd count would
  // span the full width) instead of lining up in a stable grid.
  navButton: { width: '48%' as const },
});

type MosqueSummary = { id: string; latitude: number; longitude: number };

/**
 * Resolves which mosque to show, offline-first:
 * Checks the current user's active membership mosque first so that stale local cache
 * from previous accounts or reseeded databases is never mistakenly used.
 */
async function resolveMosque(memberships: Membership[]): Promise<MosqueSummary | null> {
  const targetMosqueId = memberships[0]?.mosqueId;

  if (targetMosqueId) {
    const cached = await getCachedMosque(targetMosqueId);
    if (cached) return cached;

    try {
      await Promise.all([
        syncMosqueConfig(api, targetMosqueId),
        syncFunds(api, targetMosqueId),
        syncExpenseCategories(api, targetMosqueId),
      ]);
      const synced = await getCachedMosque(targetMosqueId);
      if (synced) return synced;
    } catch (err) {
      console.warn('[resolveMosque] error syncing active mosque:', err);
      throw err;
    }
  }

  // Fallback to API list if no membership cached yet
  try {
    const mine = await listMyMosques(api);
    const first = mine[0];
    if (!first) return null;

    await Promise.all([
      syncMosqueConfig(api, first.id), syncFunds(api, first.id), syncExpenseCategories(api, first.id),
    ]);
    const synced = await getCachedMosque(first.id);
    return synced;
  } catch (err) {
    console.warn('[resolveMosque] failed to list mosques:', err);
    throw err;
  }
}

export default function Index() {
  const { t } = useTranslation();
  const s = useStyles(indexStyles);
  const status = useSession((state) => state.status);
  const memberships = useSession((state) => state.memberships);
  const hydrate = useSession((state) => state.hydrate);
  const signOut = useSession((state) => state.signOut);

  const [resolving, setResolving] = useState(true);
  const [mosque, setMosque] = useState<MosqueSummary | null>(null);
  const [times, setTimes] = useState<DayPrayerTimes | null>(null);
  const setCurrentMosqueId = useMosque((state) => state.setCurrentMosqueId);

  useEffect(() => { void hydrate(); }, [hydrate]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;

    (async () => {
      try {
        const resolved = await resolveMosque(memberships);
        if (cancelled) return;
        setMosque(resolved);
        setCurrentMosqueId(resolved?.id ?? null);
        setResolving(false);
        if (!resolved) return;

        const config = await getCachedPrayerConfig(resolved.id);
        if (cancelled || !config) return;
        setTimes(computePrayerTimes(config, resolved, new Date()));

        // Refresh in the background — catch errors gracefully to prevent unhandled rejections
        syncMosqueConfig(api, resolved.id).catch((err) => console.warn('[Background Sync] syncMosqueConfig:', err));
        syncFunds(api, resolved.id).catch((err) => console.warn('[Background Sync] syncFunds:', err));
        syncExpenseCategories(api, resolved.id).catch((err) => console.warn('[Background Sync] syncExpenseCategories:', err));
        bootstrapIfNeeded(api, resolved.id).catch((err) => console.warn('[Background Sync] bootstrapIfNeeded:', err));
      } catch (err: unknown) {
        if (cancelled) return;
        setResolving(false);
        if (err instanceof ApiError && (err.status === 401 || err.status === 403 || err.code === 'AUTH_UNAUTHORIZED' || err.code === 'TENANT_FORBIDDEN')) {
          console.warn('Session expired or membership invalid. Signing out to allow fresh sign-in...');
          await signOut();
        } else {
          console.error('[Index] Error resolving mosque:', err);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [status, memberships, setCurrentMosqueId, signOut]);

  if (status === 'loading') return <View style={s.fill} />;
  if (status === 'unauthenticated') return <Redirect href="/(auth)/sign-in" />;
  if (resolving) return <View style={s.fill} />;

  if (!mosque) {
    return (
      <View style={s.fill}>
        <EmptyState
          message={t('home.noMosque')}
          actionLabel={t('home.createMosque')}
          onAction={() => router.push('/mosques/create')}
        />
        <View style={s.content}>
          <Button
            label={t('home.joinMosque')}
            variant="secondary"
            onPress={() => router.push('/invitations/accept')}
          />
          <Button label={t('nav.signOut')} variant="ghost" onPress={() => void signOut()} />
        </View>
      </View>
    );
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
        <View style={s.navButton}>
          <Button label={t('nav.dues')} variant="secondary" onPress={() => router.push('/dues')} />
        </View>
        <View style={s.navButton}>
          <Button label={t('nav.payroll')} variant="secondary" onPress={() => router.push('/payroll')} />
        </View>
        <View style={s.navButton}>
          <Button label={t('nav.committee')} variant="secondary" onPress={() => router.push('/committee')} />
        </View>
        <View style={s.navButton}>
          <Button label={t('nav.events')} variant="secondary" onPress={() => router.push('/events')} />
        </View>
        <View style={s.navButton}>
          <Button label={t('nav.announcements')} variant="secondary" onPress={() => router.push('/announcements')} />
        </View>
        <View style={s.navButton}>
          <Button label={t('nav.statistics')} variant="secondary" onPress={() => router.push('/statistics')} />
        </View>
        <View style={s.navButton}>
          <Button label={t('nav.plan')} variant="secondary" onPress={() => router.push('/settings/plan')} />
        </View>
        <View style={s.navButton}>
          <Button label={t('nav.notifications')} variant="secondary" onPress={() => router.push('/settings/notifications')} />
        </View>
        <View style={s.navButton}>
          <Button label={t('nav.syncIssues')} variant="secondary" onPress={() => router.push('/sync-issues')} />
        </View>
        <View style={s.navButton}>
          <Button label={t('nav.members')} variant="secondary" onPress={() => router.push('/settings/members')} />
        </View>
        <View style={s.navButton}>
          <Button label={t('nav.language')} variant="secondary" onPress={() => router.push('/settings/language')} />
        </View>
        <View style={s.navButton}>
          <Button label={t('nav.signOut')} variant="secondary" onPress={() => void signOut()} />
        </View>
      </View>
    </ScrollView>
  );
}
