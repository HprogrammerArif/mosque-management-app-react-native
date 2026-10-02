import { useEffect, useState, useMemo } from 'react';
import { View, ScrollView, Text, ActivityIndicator } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useStyles } from '../src/theme/use-styles';
import { useTheme } from '../src/theme/ThemeProvider';
import type { Theme } from '../src/theme/tokens';
import { ApiError } from '../src/api/client';
import { useSession, api, type Membership } from '../src/stores/session';
import { useMosque } from '../src/stores/mosque';
import { PrayerRail } from '../src/components/ui/PrayerRail';
import { PrayerTable } from '../src/components/ui/PrayerTable';
import { EmptyState } from '../src/components/ui/EmptyState';
import { Button } from '../src/components/ui/Button';
import { SyncBadge } from '../src/components/ui/SyncBadge';
import { BottomNav } from '../src/components/ui/BottomNav';
import { computePrayerTimes, type DayPrayerTimes } from '../src/lib/prayer-times';
import { calculateQibla } from '../src/lib/qibla';
import { listMyMosques } from '../src/api/mosques';
import {
  syncMosqueConfig, getCachedMosque, getCachedPrayerConfig,
  syncFunds, syncExpenseCategories,
} from '../src/data/sync-mosque';
import { bootstrapIfNeeded } from '../src/data/sync-engine';

const indexStyles = (t: Theme) => ({
  fill: { flex: 1, backgroundColor: t.color.paper },
  scroll: { flex: 1, backgroundColor: t.color.paper },
  content: { padding: t.space[4], gap: t.space[5], paddingBottom: t.space[10] },

  // Center loading box
  centerBox: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: t.color.paper,
    gap: t.space[3],
  },
  loadingText: { ...t.type.body, fontFamily: t.font.text, color: t.color.stone },

  // Header Bar
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: t.space[2],
  },
  headerLeft: { flex: 1, gap: 2 },
  appName: {
    ...t.type.label,
    fontFamily: t.font.sign,
    textTransform: 'uppercase' as const,
    color: t.color.verdigris,
    letterSpacing: 1.2,
  },
  mosqueTitle: {
    ...t.type.title,
    fontFamily: t.font.textSemi,
    color: t.color.ink,
  },
  userBadge: {
    ...t.type.caption,
    fontFamily: t.font.text,
    color: t.color.stone,
  },
  headerRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },

  // Hero card for prayer times
  heroCard: {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.sheet,
    padding: t.space[4],
    gap: t.space[3],
  },
  heroHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  heroTitle: {
    ...t.type.heading,
    fontFamily: t.font.textSemi,
    color: t.color.ink,
  },
  qiblaBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: t.color.paper,
    paddingHorizontal: t.space[2],
    paddingVertical: 3,
    borderRadius: t.radius.base,
    borderWidth: 1,
    borderColor: t.color.stone,
  },
  qiblaText: {
    ...t.type.caption,
    fontFamily: t.font.ledger,
    color: t.color.stone,
  },

  // Quick Action Buttons
  quickActions: {
    flexDirection: 'row' as const,
    gap: t.space[3],
  },
  quickActionBtn: {
    flex: 1,
  },

  // Section Cards
  sectionCard: {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.sheet,
    padding: t.space[4],
    gap: t.space[3],
  },
  sectionTitle: {
    ...t.type.heading,
    fontFamily: t.font.textSemi,
    color: t.color.ink,
  },
  sectionGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'space-between' as const,
    rowGap: t.space[3],
  },
  gridItem: {
    width: '48.5%' as const,
  },

  footer: {
    marginTop: t.space[4],
    paddingTop: t.space[4],
    borderTopWidth: 1,
    borderTopColor: t.color.surface,
    alignItems: 'center' as const,
  },
});

type MosqueSummary = { id: string; latitude: number; longitude: number };

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
  const theme = useTheme();
  const status = useSession((state) => state.status);
  const user = useSession((state) => state.user);
  const memberships = useSession((state) => state.memberships);
  const hydrate = useSession((state) => state.hydrate);
  const signOut = useSession((state) => state.signOut);

  const [resolving, setResolving] = useState(true);
  const [mosque, setMosque] = useState<MosqueSummary | null>(null);
  const [times, setTimes] = useState<DayPrayerTimes | null>(null);
  const setCurrentMosqueId = useMosque((state) => state.setCurrentMosqueId);

  const qibla = useMemo(() => {
    if (mosque && Number.isFinite(mosque.latitude) && Number.isFinite(mosque.longitude)) {
      return calculateQibla(mosque.latitude, mosque.longitude);
    }
    return null;
  }, [mosque]);

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

  if (status === 'loading' || resolving) {
    return (
      <View style={s.centerBox}>
        <ActivityIndicator size="large" color={theme.color.verdigris} />
        <Text style={s.loadingText}>{t('common.loading', { defaultValue: 'Loading Masjid OS...' })}</Text>
      </View>
    );
  }

  if (status === 'unauthenticated') return <Redirect href="/(auth)/sign-in" />;

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

  if (!times) {
    return (
      <View style={s.centerBox}>
        <ActivityIndicator size="large" color={theme.color.verdigris} />
        <Text style={s.loadingText}>{t('common.loading', { defaultValue: 'Calculating prayer schedule...' })}</Text>
      </View>
    );
  }

  const activeMembership = memberships.find((m) => m.mosqueId === mosque.id) ?? memberships[0];
  const mosqueName = activeMembership?.mosqueName ?? 'Masjid OS';

  return (
    <View style={s.fill}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        {/* Mosque Identity & Profile Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.appName}>MASJID OS</Text>
            <Text style={s.mosqueTitle}>{mosqueName}</Text>
            {user?.displayName && <Text style={s.userBadge}>{user.displayName}</Text>}
          </View>
          <View style={s.headerRight}>
            <SyncBadge />
          </View>
        </View>

        {/* Hero Prayer Times Card */}
        <View style={s.heroCard}>
          <View style={s.heroHeader}>
            <Text style={s.heroTitle}>{t('prayer.schedule', { defaultValue: "Today's Schedule" })}</Text>
            {qibla !== null && (
              <View style={s.qiblaBadge}>
                <Text style={s.qiblaText}>🧭 Qibla: {qibla.degrees}° {qibla.compassDirection}</Text>
              </View>
            )}
          </View>
          <PrayerRail times={times} size="hero" />
          <PrayerTable times={times} />
        </View>

        {/* Quick Entry Actions */}
        <View style={s.quickActions}>
          <View style={s.quickActionBtn}>
            <Button
              label={`+ ${t('nav.donations')}`}
              onPress={() => router.push('/donations/record')}
            />
          </View>
          <View style={s.quickActionBtn}>
            <Button
              label={`+ ${t('nav.expenses')}`}
              variant="secondary"
              onPress={() => router.push('/expenses/record')}
            />
          </View>
        </View>

        {/* Financial Operations Section */}
        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>{t('nav.donations')} &amp; {t('nav.expenses')}</Text>
          <View style={s.sectionGrid}>
            <View style={s.gridItem}>
              <Button label={t('nav.donations')} variant="secondary" onPress={() => router.push('/donations')} />
            </View>
            <View style={s.gridItem}>
              <Button label={t('nav.expenses')} variant="secondary" onPress={() => router.push('/expenses')} />
            </View>
            <View style={s.gridItem}>
              <Button label={t('nav.dues')} variant="secondary" onPress={() => router.push('/dues')} />
            </View>
            <View style={s.gridItem}>
              <Button label={t('nav.payroll')} variant="secondary" onPress={() => router.push('/payroll')} />
            </View>
          </View>
        </View>

        {/* Community & Administration Section */}
        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>{t('nav.households')} &amp; {t('nav.community', { defaultValue: 'Community' })}</Text>
          <View style={s.sectionGrid}>
            <View style={s.gridItem}>
              <Button label={t('nav.households')} variant="secondary" onPress={() => router.push('/households')} />
            </View>
            <View style={s.gridItem}>
              <Button label={t('nav.committee')} variant="secondary" onPress={() => router.push('/committee')} />
            </View>
            <View style={s.gridItem}>
              <Button label={t('nav.events')} variant="secondary" onPress={() => router.push('/events')} />
            </View>
            <View style={s.gridItem}>
              <Button label={t('nav.announcements')} variant="secondary" onPress={() => router.push('/announcements')} />
            </View>
          </View>
        </View>

        {/* Analytics & System Section */}
        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>{t('nav.statistics')} &amp; {t('nav.system', { defaultValue: 'System' })}</Text>
          <View style={s.sectionGrid}>
            <View style={s.gridItem}>
              <Button label={t('nav.statistics')} variant="secondary" onPress={() => router.push('/statistics')} />
            </View>
            <View style={s.gridItem}>
              <Button label={t('nav.syncIssues')} variant="secondary" onPress={() => router.push('/sync-issues')} />
            </View>
            <View style={s.gridItem}>
              <Button label={t('nav.members')} variant="secondary" onPress={() => router.push('/settings/members')} />
            </View>
            <View style={s.gridItem}>
              <Button label={t('nav.plan')} variant="secondary" onPress={() => router.push('/settings/plan')} />
            </View>
            <View style={s.gridItem}>
              <Button label={t('nav.notifications')} variant="secondary" onPress={() => router.push('/settings/notifications')} />
            </View>
            <View style={s.gridItem}>
              <Button label={t('nav.language')} variant="secondary" onPress={() => router.push('/settings/language')} />
            </View>
          </View>
        </View>

        {/* Footer with Sign Out */}
        <View style={s.footer}>
          <Button label={t('nav.signOut')} variant="ghost" onPress={() => void signOut()} />
        </View>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

