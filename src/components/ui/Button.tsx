import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import { useStyles } from '../../theme/use-styles';
import type { Theme } from '../../theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
};

// Module scope: a stable identity, so the useStyles cache is hit on every render.
const buttonStyles = (t: Theme) => ({
  base: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: t.radius.base,
    minHeight: 48,
    paddingHorizontal: t.space[4],
  },
  sm: { minHeight: 48, paddingHorizontal: t.space[3] },   // never below 48 (NFR-A11Y-2)
  md: { minHeight: 48, paddingHorizontal: t.space[4] },
  lg: { minHeight: 56, paddingHorizontal: t.space[6] },

  primary:     { backgroundColor: t.color.verdigris },
  secondary:   { borderWidth: 1, borderColor: t.color.ink, backgroundColor: 'transparent' },
  ghost:       { backgroundColor: 'transparent' },
  destructive: { backgroundColor: t.color.brick },

  inactive: { opacity: 0.5 },

  labelBase:        { ...t.type.bodyLg, fontFamily: t.font.textSemi },
  labelPrimary:     { color: t.color.paper },
  labelSecondary:   { color: t.color.ink },
  labelGhost:       { color: t.color.verdigris },
  labelDestructive: { color: t.color.paper },

  hidden:  { opacity: 0 },
  spinner: { position: 'absolute' as const },
});

const LABEL_KEY = {
  primary: 'labelPrimary', secondary: 'labelSecondary',
  ghost: 'labelGhost', destructive: 'labelDestructive',
} as const;

export function Button({
  label, onPress, variant = 'primary', size = 'md', disabled, loading,
}: ButtonProps) {
  const s = useStyles(buttonStyles);
  const inactive = disabled === true || loading === true;
  const spinnerColour = variant === 'secondary' || variant === 'ghost' ? '#3F6F66' : '#F2EDE0';

  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading === true }}
      style={[s.base, s[size], s[variant], inactive && s.inactive]}
    >
      {/* The label stays mounted while loading so the button does not change width. */}
      <Text style={[s.labelBase, s[LABEL_KEY[variant]], loading === true && s.hidden]}>
        {label}
      </Text>
      {loading === true && (
        <View style={s.spinner}>
          <ActivityIndicator color={spinnerColour} />
        </View>
      )}
    </Pressable>
  );
}
