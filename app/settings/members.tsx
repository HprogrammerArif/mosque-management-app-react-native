import { useCallback, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';
import { useStyles } from '../../src/theme/use-styles';
import type { Theme } from '../../src/theme/tokens';
import { api, useSession } from '../../src/stores/session';
import { useMosque } from '../../src/stores/mosque';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { SelectField } from '../../src/components/ui/SelectField';
import { EmptyState } from '../../src/components/ui/EmptyState';
import {
  listMembers, inviteMember, type MemberListResponse, type InvitationResponse,
} from '../../src/api/mosques';
import { ApiError } from '../../src/api/client';

const ROLES = ['ADMIN', 'TREASURER', 'COMMITTEE', 'STAFF', 'MEMBER'] as const;
const INVITER_ROLES = new Set(['ADMIN', 'TREASURER']);

const listStyles = (t: Theme) => ({
  fill: { flex: 1, backgroundColor: t.color.paper },
  content: { padding: t.space[5], gap: t.space[3] },
  sectionTitle: { ...t.type.body, fontFamily: t.font.textSemi, color: t.color.ink },
  row: {
    minHeight: 48, justifyContent: 'center' as const,
    borderBottomWidth: 1, borderBottomColor: t.color.surface, paddingVertical: t.space[2],
  },
  roleText: { ...t.type.caption, fontFamily: t.font.text, color: t.color.stone },
  tokenCard: {
    borderRadius: t.radius.base, borderWidth: 1, borderColor: t.color.ochre,
    backgroundColor: t.color.surface, padding: t.space[3], gap: t.space[1],
  },
  tokenLabel: { ...t.type.caption, fontFamily: t.font.text, color: t.color.stone },
  tokenValue: { ...t.type.body, fontFamily: t.font.ledger, color: t.color.ink },
  errorBox: {
    borderRadius: t.radius.base, borderWidth: 1, borderColor: t.color.brick,
    backgroundColor: t.color.surface, padding: t.space[3],
  },
  errorText: { ...t.type.body, fontFamily: t.font.text, color: t.color.brick },
});

export default function MembersScreen() {
  const { t } = useTranslation();
  const s = useStyles(listStyles);
  const mosqueId = useMosque((state) => state.currentMosqueId);
  const role = useSession((state) =>
    state.memberships.find((m) => m.mosqueId === mosqueId)?.role ?? null);

  const [members, setMembers] = useState<MemberListResponse | null>(null);
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [inviteRole, setInviteRole] = useState<string | null>('MEMBER');
  const [issued, setIssued] = useState<InvitationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    if (mosqueId === null) return;
    setMembers(await listMembers(api, mosqueId));
  }, [mosqueId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function handleInvite(): Promise<void> {
    if (mosqueId === null || inviteRole === null || emailOrPhone.trim() === '') return;
    setInviting(true);
    setError(null);
    setIssued(null);
    try {
      const invitation = await inviteMember(
        api, mosqueId, { emailOrPhone: emailOrPhone.trim(), role: inviteRole as typeof ROLES[number] },
        Crypto.randomUUID(),
      );
      setIssued(invitation);
      setEmailOrPhone('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.errors.generic'));
    } finally {
      setInviting(false);
    }
  }

  if (members === null) return <View style={s.fill} />;

  return (
    <FlatList
      style={s.fill}
      contentContainerStyle={s.content}
      data={members}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <>
          {role !== null && INVITER_ROLES.has(role) && (
            <View style={{ gap: 4 }}>
              <Text style={s.sectionTitle}>{t('members.invite')}</Text>
              <Input label={t('members.emailOrPhone')} value={emailOrPhone} onChangeText={setEmailOrPhone} />
              <SelectField
                label={t('members.role')}
                value={inviteRole}
                options={ROLES.map((r) => ({ value: r, label: t(`members.roles.${r}`) }))}
                onChange={setInviteRole}
              />

              {issued !== null && (
                <View style={s.tokenCard}>
                  <Text style={s.tokenLabel}>{t('members.tokenIssued')}</Text>
                  <Text style={s.tokenValue} selectable>{issued.token}</Text>
                  <Text style={s.tokenLabel}>
                    {t('members.expiresNote', { date: new Date(issued.expiresAt).toLocaleDateString() })}
                  </Text>
                </View>
              )}

              {error !== null && (
                <View style={s.errorBox}>
                  <Text style={s.errorText}>{error}</Text>
                </View>
              )}

              <Button
                label={t('members.send')}
                onPress={handleInvite}
                loading={inviting}
                disabled={emailOrPhone.trim() === '' || inviteRole === null}
              />
            </View>
          )}

          <Text style={s.sectionTitle}>{t('members.title')}</Text>
          {members.length === 0 && <EmptyState message={t('members.empty')} />}
        </>
      }
      renderItem={({ item }) => (
        <View style={s.row}>
          <Text style={s.roleText}>{t(`members.roles.${item.role}`)} · {item.status}</Text>
        </View>
      )}
    />
  );
}
