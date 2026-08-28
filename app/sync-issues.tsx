import { useCallback, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useStyles } from '../src/theme/use-styles';
import type { Theme } from '../src/theme/tokens';
import { api } from '../src/stores/session';
import { useMosque } from '../src/stores/mosque';
import { Button } from '../src/components/ui/Button';
import { EmptyState } from '../src/components/ui/EmptyState';
import { listFailedMutations, retryFailedMutation, runSync, type FailedMutation } from '../src/data/sync-engine';
import { summarizeOutboxRow } from '../src/data/summarize-outbox-row';

const issuesStyles = (t: Theme) => ({
  fill: { flex: 1, backgroundColor: t.color.paper },
  content: { padding: t.space[5], gap: t.space[4] },
  card: {
    borderRadius: t.radius.base, borderWidth: 1, borderColor: t.color.brick,
    backgroundColor: t.color.surface, padding: t.space[4], gap: t.space[2],
  },
  entity: { ...t.type.caption, fontFamily: t.font.sign, textTransform: 'uppercase' as const, color: t.color.stone },
  summary: { ...t.type.body, fontFamily: t.font.textSemi, color: t.color.ink },
  error: { ...t.type.body, fontFamily: t.font.text, color: t.color.brick },
});

export default function SyncIssues() {
  const { t } = useTranslation();
  const s = useStyles(issuesStyles);
  const mosqueId = useMosque((state) => state.currentMosqueId);
  const [issues, setIssues] = useState<FailedMutation[] | null>(null);
  const [retrying, setRetrying] = useState<number | null>(null);

  const load = useCallback(async () => {
    setIssues(await listFailedMutations());
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onRetry = async (seq: number) => {
    if (mosqueId === null) return;
    setRetrying(seq);
    try {
      await retryFailedMutation(seq);
      await runSync(api, mosqueId);
    } finally {
      setRetrying(null);
      await load();
    }
  };

  if (issues === null) return <View style={s.fill} />;

  return (
    <View style={s.fill}>
      {issues.length === 0 ? (
        <EmptyState message={t('syncIssues.empty')} />
      ) : (
        <FlatList
          contentContainerStyle={s.content}
          data={issues}
          keyExtractor={(item) => String(item.seq)}
          renderItem={({ item }) => (
            <View style={s.card}>
              <Text style={s.entity}>{t(`syncIssues.entities.${item.entity}`, item.entity)}</Text>
              <Text style={s.summary}>{summarizeOutboxRow(item)}</Text>
              <Text style={s.error}>{item.lastError ?? t('syncIssues.unknownError')}</Text>
              <Button
                label={t('syncIssues.retry')}
                variant="secondary"
                onPress={() => onRetry(item.seq)}
                loading={retrying === item.seq}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}
