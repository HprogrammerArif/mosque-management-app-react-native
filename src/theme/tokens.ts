type ColorKey = 'ink' | 'verdigris' | 'paper' | 'surface' | 'stone' | 'brick' | 'ochre';

/**
 * Space, radius, font and type scale are identical between themes — only colour
 * varies. Kept `as const` here so their literal numeric/string values stay precise;
 * spread into both themes below so they are guaranteed identical by construction,
 * not just by convention.
 */
const shared = {
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 },
  radius: { none: 0, base: 4, sheet: 8, modal: 12 },
  font: {
    sign: 'IBMPlexSansCondensed_600SemiBold',
    text: 'HindSiliguri_400Regular',
    textSemi: 'HindSiliguri_600SemiBold',
    ledger: 'IBMPlexMono_400Regular',
  },
  type: {
    display:    { fontSize: 32, lineHeight: 38 },
    title:      { fontSize: 24, lineHeight: 30 },
    heading:    { fontSize: 20, lineHeight: 26 },
    bodyLg:     { fontSize: 17, lineHeight: 26 },
    body:       { fontSize: 15, lineHeight: 23 },
    caption:    { fontSize: 13, lineHeight: 18 },
    label:      { fontSize: 12, lineHeight: 16, letterSpacing: 0.96 },
    ledgerHero: { fontSize: 34, lineHeight: 40 },
    ledger:     { fontSize: 15, lineHeight: 22 },
  },
} as const;

export const lightTheme = {
  color: {
    ink: '#141A1F', verdigris: '#3F6F66', paper: '#F2EDE0', surface: '#FAF7F0',
    stone: '#8A8578', brick: '#A8443A', ochre: '#B07C24',
  } as Record<ColorKey, string>,
  ...shared,
};

export type Theme = typeof lightTheme;

/**
 * The annotation is the enforcement: a missing or misnamed key is a compile error.
 * `color` is typed as `Record<ColorKey, string>` above specifically so this can hold
 * genuinely different hex values from lightTheme while still being caught if a key is
 * missing or misspelled — the earlier version used a blanket `as const` on the whole
 * object, which inferred literal hex-string types for lightTheme's colours and made it
 * a compile error for darkTheme to hold different (correct, intentional) values.
 */
export const darkTheme: Theme = {
  color: {
    ink: '#F0ECE2', verdigris: '#67A396', paper: '#141A1F', surface: '#1D242B',
    stone: '#7E8A88', brick: '#D4736A', ochre: '#D9A94A',
  },
  ...shared,
};
