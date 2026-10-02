import { useCallback, useState } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useStyles } from '../../src/theme/use-styles';
import type { Theme } from '../../src/theme/tokens';
import { api } from '../../src/stores/session';
import { useMosque } from '../../src/stores/mosque';
import { Button } from '../../src/components/ui/Button';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { BottomNav } from '../../src/components/ui/BottomNav';
import { openDb } from '../../src/data/db';
import { households as householdsTable } from '../../src/data/schema';
import { runSync } from '../../src/data/sync-engine';

type LocalHousehold = typeof householdsTable.$inferSelect;

const listStyles = (t: Theme) => ({
  fill: { flex: 1, backgroundColor: t.color.paper },
  content: { padding: t.space[5], gap: t.space[4] },
  row: {
    minHeight: 48, justifyContent: 'center' as const,
    borderBottomWidth: 1, borderBottomColor: t.color.surface, paddingVertical: t.space[2],
  },
  name: { ...t.type.body, fontFamily: t.font.textSemi, color: t.color.ink },
  area: { ...t.type.caption, fontFamily: t.font.text, color: t.color.stone },
  pending: { color: t.color.ochre },
});

/** Reads local SQLite — see donations/index.tsx's loadLocalDonations for why. */
async function loadLocalHouseholds(): Promise<LocalHousehold[]> {
  const db = await openDb();
  return db.select().from(householdsTable);
}

export default function HouseholdsList() {
  const { t } = useTranslation();
  const s = useStyles(listStyles);
  const mosqueId = useMosque((state) => state.currentMosqueId);
  const [households, setHouseholds] = useState<LocalHousehold[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setHouseholds(await loadLocalHouseholds());
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    if (mosqueId !== null) await runSync(api, mosqueId);
    await load();
    setRefreshing(false);
  };

  if (households === null) return <View style={s.fill} />;

  return (
    <View style={s.fill}>
      <View style={s.content}>
        <Button label={t('households.register')} onPress={() => router.push('/households/register')} />
      </View>

      {households.length === 0 ? (
        <EmptyState message={t('households.empty')} />
      ) : (
        <FlatList
          contentContainerStyle={s.content}
          data={households}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={s.row}>
              <Text style={s.name}>{item.name}</Text>
              {item.area !== null && (
                <Text style={[s.area, item.dirty && s.pending]}>
                  {item.area}{item.dirty ? ` · ${t('common.pending')}` : ''}
                </Text>
              )}
            </View>
          )}
        />
      )}
      <BottomNav />
    </View>
  );
}
