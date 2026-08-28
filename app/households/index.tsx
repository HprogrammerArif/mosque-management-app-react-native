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
import { listHouseholds, type HouseholdResponse } from '../../src/api/money';

const listStyles = (t: Theme) => ({
  fill: { flex: 1, backgroundColor: t.color.paper },
  content: { padding: t.space[5], gap: t.space[4] },
  row: {
    minHeight: 48, justifyContent: 'center' as const,
    borderBottomWidth: 1, borderBottomColor: t.color.surface, paddingVertical: t.space[2],
  },
  name: { ...t.type.body, fontFamily: t.font.textSemi, color: t.color.ink },
  area: { ...t.type.caption, fontFamily: t.font.text, color: t.color.stone },
});

export default function HouseholdsList() {
  const { t } = useTranslation();
  const s = useStyles(listStyles);
  const mosqueId = useMosque((state) => state.currentMosqueId);
  const [households, setHouseholds] = useState<HouseholdResponse[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (mosqueId === null) return;
    const result = await listHouseholds(api, mosqueId);
    setHouseholds(result);
  }, [mosqueId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
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
              {item.area !== null && <Text style={s.area}>{item.area}</Text>}
            </View>
          )}
        />
      )}
    </View>
  );
}
