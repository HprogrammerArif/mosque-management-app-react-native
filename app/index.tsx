import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { useStyles } from '../src/theme/use-styles';
import type { Theme } from '../src/theme/tokens';
import { useSession } from '../src/stores/session';

const indexStyles = (t: Theme) => ({
  fill:   { flex: 1, backgroundColor: t.color.paper },
  centre: {
    flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const,
    backgroundColor: t.color.paper,
  },
  text: { ...t.type.title, fontFamily: t.font.textSemi, color: t.color.ink },
});

export default function Index() {
  const s = useStyles(indexStyles);
  const status = useSession((state) => state.status);
  const user = useSession((state) => state.user);
  const hydrate = useSession((state) => state.hydrate);

  useEffect(() => { void hydrate(); }, [hydrate]);

  if (status === 'loading') return <View style={s.fill} />;
  if (status === 'unauthenticated') return <Redirect href="/(auth)/sign-in" />;

  return (
    <View style={s.centre}>
      <Text style={s.text}>Signed in as {user?.displayName}</Text>
    </View>
  );
}
