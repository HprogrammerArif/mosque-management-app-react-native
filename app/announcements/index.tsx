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
import { listAnnouncements, type AnnouncementResponse } from '../../src/api/money';

const listStyles = (t: Theme) => ({
  fill: { flex: 1, backgroundColor: t.color.paper },
  content: { padding: t.space[5], gap: t.space[4] },
  row: {
    borderRadius: t.radius.base, borderWidth: 1, borderColor: t.color.surface,
    padding: t.space[3], gap: t.space[1],
  },
  rowUrgent: { borderColor: t.color.brick, backgroundColor: t.color.surface },
  title: { ...t.type.body, fontFamily: t.font.textSemi, color: t.color.ink },
  urgentBadge: { ...t.type.caption, fontFamily: t.font.textSemi, color: t.color.brick },
  body: { ...t.type.body, fontFamily: t.font.text, color: t.color.ink },
  date: { ...t.type.caption, fontFamily: t.font.text, color: t.color.stone },
});

export default function AnnouncementsList() {
  const { t } = useTranslation();
  const s = useStyles(listStyles);
  const mosqueId = useMosque((state) => state.currentMosqueId);
  const [announcements, setAnnouncements] = useState<AnnouncementResponse[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (mosqueId === null) return;
    try {
      setAnnouncements(await listAnnouncements(api, mosqueId));
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [mosqueId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (announcements === null) {
    return loadError
      ? <EmptyState message={t('common.errors.loadFailed')} actionLabel={t('common.retry')} onAction={load} />
      : <View style={s.fill} />;
  }

  return (
    <View style={s.fill}>
      <View style={s.content}>
        <Button label={t('announcements.add')} onPress={() => router.push('/announcements/add')} />
      </View>

      {announcements.length === 0 ? (
        <EmptyState message={t('announcements.empty')} />
      ) : (
        <FlatList
          contentContainerStyle={s.content}
          data={announcements}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[s.row, item.urgent && s.rowUrgent]}>
              {item.urgent && <Text style={s.urgentBadge}>{t('announcements.urgent')}</Text>}
              <Text style={s.title}>{item.title}</Text>
              <Text style={s.body}>{item.body}</Text>
              <Text style={s.date}>{new Date(item.createdAt).toLocaleString('en-GB')}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
