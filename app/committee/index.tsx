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
import { listCommitteeMembers, type CommitteeMemberResponse } from '../../src/api/money';

const listStyles = (t: Theme) => ({
  fill: { flex: 1, backgroundColor: t.color.paper },
  content: { padding: t.space[5], gap: t.space[4] },
  row: {
    minHeight: 48, justifyContent: 'center' as const,
    borderBottomWidth: 1, borderBottomColor: t.color.surface, paddingVertical: t.space[2],
  },
  name: { ...t.type.body, fontFamily: t.font.textSemi, color: t.color.ink },
  position: { ...t.type.caption, fontFamily: t.font.text, color: t.color.stone },
});

export default function CommitteeList() {
  const { t } = useTranslation();
  const s = useStyles(listStyles);
  const mosqueId = useMosque((state) => state.currentMosqueId);
  const [members, setMembers] = useState<CommitteeMemberResponse[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (mosqueId === null) return;
    try {
      setMembers(await listCommitteeMembers(api, mosqueId));
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [mosqueId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (members === null) {
    return loadError
      ? <EmptyState message={t('common.errors.loadFailed')} actionLabel={t('common.retry')} onAction={load} />
      : <View style={s.fill} />;
  }

  return (
    <View style={s.fill}>
      <View style={s.content}>
        <Button label={t('committee.add')} onPress={() => router.push('/committee/add')} />
      </View>

      {members.length === 0 ? (
        <EmptyState message={t('committee.empty')} />
      ) : (
        <FlatList
          contentContainerStyle={s.content}
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={s.row}>
              <Text style={s.name}>{item.name}</Text>
              {item.position !== null && <Text style={s.position}>{item.position}</Text>}
            </View>
          )}
        />
      )}
    </View>
  );
}
