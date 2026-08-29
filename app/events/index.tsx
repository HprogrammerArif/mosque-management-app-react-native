import { useCallback, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useStyles } from '../../src/theme/use-styles';
import type { Theme } from '../../src/theme/tokens';
import { api } from '../../src/stores/session';
import { useMosque } from '../../src/stores/mosque';
import { Button } from '../../src/components/ui/Button';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { listUpcomingEvents, type EventResponse } from '../../src/api/money';
import { toHijri, formatHijri } from '../../src/lib/hijri-date';

const listStyles = (t: Theme) => ({
  fill: { flex: 1, backgroundColor: t.color.paper },
  content: { padding: t.space[5], gap: t.space[4] },
  row: {
    minHeight: 56, justifyContent: 'center' as const,
    borderBottomWidth: 1, borderBottomColor: t.color.surface, paddingVertical: t.space[2],
  },
  title: { ...t.type.body, fontFamily: t.font.textSemi, color: t.color.ink },
  date: { ...t.type.caption, fontFamily: t.font.text, color: t.color.stone },
  location: { ...t.type.caption, fontFamily: t.font.text, color: t.color.stone },
});

function formatEventDate(startsAt: string): string {
  const date = new Date(startsAt);
  const gregorian = date.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  return `${gregorian} · ${formatHijri(toHijri(date))}`;
}

export default function EventsList() {
  const { t } = useTranslation();
  const s = useStyles(listStyles);
  const mosqueId = useMosque((state) => state.currentMosqueId);
  const [events, setEvents] = useState<EventResponse[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (mosqueId === null) return;
    try {
      setEvents(await listUpcomingEvents(api, mosqueId));
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [mosqueId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (events === null) {
    return loadError
      ? <EmptyState message={t('common.errors.loadFailed')} actionLabel={t('common.retry')} onAction={load} />
      : <View style={s.fill} />;
  }

  return (
    <View style={s.fill}>
      <View style={s.content}>
        <Button label={t('events.add')} onPress={() => router.push('/events/add')} />
      </View>

      {events.length === 0 ? (
        <EmptyState message={t('events.empty')} />
      ) : (
        <FlatList
          contentContainerStyle={s.content}
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={s.row}>
              <Text style={s.title}>{item.title}</Text>
              <Text style={s.date}>{formatEventDate(item.startsAt)}</Text>
              {item.location !== null && <Text style={s.location}>{item.location}</Text>}
            </View>
          )}
        />
      )}
    </View>
  );
}
