import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Animated, AccessibilityInfo, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useStyles } from '../../theme/use-styles';
import type { Theme } from '../../theme/tokens';
import type { DayPrayerTimes, PrayerName } from '../../lib/prayer-times';

export type PrayerRailProps = {
  times: DayPrayerTimes;
  /** Full-width home-screen hero by default; pass 'compact' for the 24pt header strip. */
  size?: 'hero' | 'compact';
};

const railStyles = (t: Theme) => ({
  wrapper: { gap: t.space[2] },
  labels: { flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  labelText: {
    ...t.type.label, fontFamily: t.font.sign, textTransform: 'uppercase' as const, color: t.color.stone,
  },
  track: {
    height: 12, borderRadius: t.radius.base, backgroundColor: t.color.surface,
    overflow: 'hidden' as const, justifyContent: 'center' as const,
  },
  trackCompact: { height: 24 },
  // Physical `left`, not logical `start`: the design-system doc calls for the rail to
  // fill right-to-left under RTL (§5), but RTL is explicitly out of scope for this build
  // (twelve-week-plan.md, "Explicitly out of scope" — Arabic/Urdu/RTL). Flipping this
  // to respect I18nManager.isRTL is real work for whenever RTL actually lands, not a
  // one-line fix — deferred and named rather than silently ignored.
  // eslint-disable-next-line no-restricted-syntax -- RTL deferred, see comment above
  fill: { position: 'absolute' as const, left: 0, top: 0, bottom: 0, backgroundColor: t.color.verdigris },
  marker: {
    position: 'absolute' as const, top: -2, bottom: -2, width: 2, backgroundColor: t.color.ink,
  },
  summary: { ...t.type.caption, fontFamily: t.font.ledger, color: t.color.stone },
});

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

/** Fraction of [fajr, isha] elapsed at `now`, clamped to [0, 1]. */
function railFraction(times: DayPrayerTimes, now: Date): number {
  const start = times.slots[0]?.adhan.getTime() ?? now.getTime();
  const end = times.slots[times.slots.length - 1]?.adhan.getTime() ?? now.getTime();
  if (end <= start) return 0;
  return Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
}

function nextPrayerSlot(times: DayPrayerTimes, now: Date) {
  return times.slots.find((slot) => slot.adhan.getTime() > now.getTime()) ?? null;
}

export function PrayerRail({ times, size = 'hero' }: PrayerRailProps) {
  const { t } = useTranslation();
  const s = useStyles(railStyles);
  const [now, setNow] = useState(() => new Date());
  const [trackWidth, setTrackWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  // useState's lazy initializer (not useRef().current) for a stable Animated.Value —
  // reading ref.current during render trips eslint-plugin-react-hooks's refs rule.
  const [fillAnim] = useState(() => new Animated.Value(0));
  const [markerAnim] = useState(() => new Animated.Value(0));
  const lastSegment = useRef(-1);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    // A 30s tick is enough for a minute-granularity countdown to look live without
    // redrawing every frame — this is a rail, not a stopwatch.
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const fraction = useMemo(() => railFraction(times, now), [times, now]);
  const next = useMemo(() => nextPrayerSlot(times, now), [times, now]);

  const currentSegment = Math.min(3, Math.floor(fraction * 4));

  useEffect(() => {
    const crossingBoundary = lastSegment.current !== -1 && lastSegment.current !== currentSegment;
    lastSegment.current = currentSegment;

    const target = fraction * trackWidth;
    const duration = !reduceMotion && crossingBoundary ? 400 : 0;
    Animated.timing(fillAnim, { toValue: target, duration, useNativeDriver: false }).start();
    Animated.timing(markerAnim, { toValue: target, duration, useNativeDriver: false }).start();
  }, [fraction, trackWidth, reduceMotion, currentSegment, fillAnim, markerAnim]);

  const onTrackLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  const summary = next !== null
    ? t('prayer.railSummary', {
        prayer: t(`prayer.names.${next.prayer as PrayerName}`),
        time: formatDuration(next.adhan.getTime() - now.getTime()),
        jamaatTime: formatTime(next.jamaat),
      })
    : '';

  return (
    <View style={s.wrapper}>
      <View style={s.labels}>
        {times.slots.map((slot) => (
          <Text key={slot.prayer} style={s.labelText}>{t(`prayer.names.${slot.prayer}`)}</Text>
        ))}
      </View>

      <View
        style={[s.track, size === 'compact' && s.trackCompact]}
        onLayout={onTrackLayout}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={summary}
      >
        <Animated.View style={[s.fill, { width: fillAnim }]} />
        {/* eslint-disable-next-line no-restricted-syntax -- RTL deferred, see the `fill` style's comment above */}
        <Animated.View style={[s.marker, { left: markerAnim }]} />
      </View>

      <Text style={s.summary} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {summary}
      </Text>
    </View>
  );
}
