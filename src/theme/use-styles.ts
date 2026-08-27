import { StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';
import type { Theme } from './tokens';

// Keyed on the theme object, then on the factory function's identity.
// WeakMap so a discarded theme does not pin its styles in memory.
const cache = new WeakMap<Theme, Map<unknown, unknown>>();

export function useStyles<T extends StyleSheet.NamedStyles<T>>(factory: (t: Theme) => T): T {
  const theme = useTheme();

  let perTheme = cache.get(theme);
  if (!perTheme) { perTheme = new Map(); cache.set(theme, perTheme); }

  let styles = perTheme.get(factory);
  if (!styles) { styles = StyleSheet.create(factory(theme)); perTheme.set(factory, styles); }

  return styles as T;
}
