import { renderHook } from '@testing-library/react-native';
import { ThemeProvider } from './ThemeProvider';
import { useStyles } from './use-styles';
import { lightTheme, darkTheme, type Theme } from './tokens';

const factory = (t: Theme) => ({ box: { backgroundColor: t.color.paper, padding: t.space[4] } });

describe('useStyles', () => {
  it('resolves values from the theme', () => {
    const { result } = renderHook(() => useStyles(factory), { wrapper: ThemeProvider });
    expect(result.current.box.backgroundColor).toBe(lightTheme.color.paper);
    expect(result.current.box.padding).toBe(16);
  });

  it('returns a stable reference across renders', () => {
    const { result, rerender } = renderHook(() => useStyles(factory), { wrapper: ThemeProvider });
    const first = result.current;
    rerender({});
    // A new object here would allocate every render and defeat every downstream memo.
    expect(result.current).toBe(first);
  });

  it('returns the same reference for the same factory in two components', () => {
    const { result: a } = renderHook(() => useStyles(factory), { wrapper: ThemeProvider });
    const { result: b } = renderHook(() => useStyles(factory), { wrapper: ThemeProvider });
    expect(a.current).toBe(b.current);
  });
});

describe('themes', () => {
  it('have identical shape', () => {
    expect(Object.keys(darkTheme.color).sort()).toEqual(Object.keys(lightTheme.color).sort());
    expect(Object.keys(darkTheme.type).sort()).toEqual(Object.keys(lightTheme.type).sort());
  });
});
