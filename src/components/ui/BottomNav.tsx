import { View, Text, Pressable } from 'react-native';
import { usePathname, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useStyles } from '../../theme/use-styles';
import type { Theme } from '../../theme/tokens';

const navStyles = (t: Theme) => ({
  bar: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    alignItems: 'center' as const,
    backgroundColor: t.color.surface,
    borderTopWidth: 1,
    borderTopColor: t.color.paper,
    paddingTop: t.space[2],
    paddingBottom: t.space[4],
    minHeight: 56,
  },
  tab: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: t.space[1],
    gap: 3,
  },
  tabIconText: {
    fontSize: 16,
    lineHeight: 18,
  },
  tabLabel: {
    ...t.type.label,
    fontFamily: t.font.sign,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    color: t.color.stone,
  },
  activeTabLabel: {
    color: t.color.verdigris,
    fontFamily: t.font.sign,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: t.color.verdigris,
    marginTop: 1,
  },
  inactiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginTop: 1,
  },
});

type TabItem = {
  path: string;
  matchPrefix?: string;
  icon: string;
  labelKey: string;
  fallback: string;
};

const TABS: TabItem[] = [
  { path: '/', icon: '🕌', labelKey: 'prayer.names.dhuhr', fallback: 'Today' },
  { path: '/donations', matchPrefix: '/donations', icon: '💰', labelKey: 'nav.donations', fallback: 'Finance' },
  { path: '/households', matchPrefix: '/households', icon: '👥', labelKey: 'nav.households', fallback: 'Community' },
  { path: '/statistics', matchPrefix: '/statistics', icon: '📊', labelKey: 'nav.statistics', fallback: 'Analytics' },
  { path: '/settings/notifications', matchPrefix: '/settings', icon: '⚙️', labelKey: 'nav.system', fallback: 'Settings' },
];

export function BottomNav() {
  const { t } = useTranslation();
  const s = useStyles(navStyles);
  const pathname = usePathname();

  const isTabActive = (tab: TabItem) => {
    if (tab.path === '/') return pathname === '/' || pathname === '';
    if (tab.matchPrefix) return pathname.startsWith(tab.matchPrefix);
    return pathname === tab.path;
  };

  return (
    <View style={s.bar}>
      {TABS.map((tab) => {
        const active = isTabActive(tab);
        const label = tab.path === '/'
          ? t('nav.today', { defaultValue: 'Today' })
          : t(tab.labelKey, { defaultValue: tab.fallback });

        return (
          <Pressable
            key={tab.path}
            style={s.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
            onPress={() => {
              if (pathname !== tab.path) {
                router.push(tab.path as never);
              }
            }}
          >
            <Text style={s.tabIconText}>{tab.icon}</Text>
            <Text style={[s.tabLabel, active && s.activeTabLabel]}>
              {label}
            </Text>
            <View style={active ? s.activeDot : s.inactiveDot} />
          </Pressable>
        );
      })}
    </View>
  );
}
