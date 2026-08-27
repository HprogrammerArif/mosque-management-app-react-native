import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useStyles } from '../../theme/use-styles';
import type { Theme } from '../../theme/tokens';
import type { DayPrayerTimes, PrayerName } from '../../lib/prayer-times';

export type PrayerTableProps = {
  times: DayPrayerTimes;
};

const tableStyles = (t: Theme) => ({
  wrapper: { borderRadius: t.radius.base, backgroundColor: t.color.surface },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    minHeight: 48,
    paddingHorizontal: t.space[4],
    borderBottomWidth: 1,
    borderBottomColor: t.color.paper,
  },
  rowLast: { borderBottomWidth: 0 },
  name: { ...t.type.body, fontFamily: t.font.textSemi, color: t.color.ink, flex: 1 },
  column: { ...t.type.ledger, fontFamily: t.font.ledger, color: t.color.stone, width: 76, textAlign: 'right' as const },
  columnJamaat: { color: t.color.ink },
  header: {
    flexDirection: 'row' as const,
    paddingHorizontal: t.space[4],
    paddingTop: t.space[2],
    paddingBottom: t.space[1],
  },
  headerSpacer: { flex: 1 },
  headerLabel: {
    ...t.type.label, fontFamily: t.font.sign, textTransform: 'uppercase' as const,
    color: t.color.stone, width: 76, textAlign: 'right' as const,
  },
});

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

export function PrayerTable({ times }: PrayerTableProps) {
  const { t } = useTranslation();
  const s = useStyles(tableStyles);

  return (
    <View style={s.wrapper}>
      <View style={s.header}>
        <View style={s.headerSpacer} />
        <Text style={s.headerLabel}>{t('prayer.adhan')}</Text>
        <Text style={s.headerLabel}>{t('prayer.jamaat')}</Text>
      </View>
      {times.slots.map((slot, index) => (
        <View
          key={slot.prayer}
          style={[s.row, index === times.slots.length - 1 && s.rowLast]}
          accessible
          accessibilityLabel={`${t(`prayer.names.${slot.prayer as PrayerName}`)}, ${t('prayer.adhan')} ${formatTime(slot.adhan)}, ${t('prayer.jamaat')} ${formatTime(slot.jamaat)}`}
        >
          <Text style={s.name}>{t(`prayer.names.${slot.prayer}`)}</Text>
          <Text style={s.column}>{formatTime(slot.adhan)}</Text>
          <Text style={[s.column, s.columnJamaat]}>{formatTime(slot.jamaat)}</Text>
        </View>
      ))}
    </View>
  );
}
