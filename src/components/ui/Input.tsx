import { View, Text, TextInput, type KeyboardTypeOptions } from 'react-native';
import { useStyles } from '../../theme/use-styles';
import type { Theme } from '../../theme/tokens';

export type InputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  hint?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoFocus?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
};

const inputStyles = (t: Theme) => ({
  wrapper: { marginBottom: t.space[4] },
  label: {
    ...t.type.label,
    fontFamily: t.font.sign,
    textTransform: 'uppercase' as const,
    color: t.color.stone,
    marginBottom: t.space[2],
  },
  field: {
    minHeight: 48,
    borderRadius: t.radius.base,
    borderWidth: 1,
    borderColor: t.color.stone,
    backgroundColor: t.color.surface,
    paddingHorizontal: t.space[3],
    ...t.type.bodyLg,
    fontFamily: t.font.text,
    color: t.color.ink,
  },
  fieldInvalid: { borderColor: t.color.brick },
  hint:  { ...t.type.caption, fontFamily: t.font.text, color: t.color.stone, marginTop: t.space[1] },
  error: { ...t.type.caption, fontFamily: t.font.text, color: t.color.brick, marginTop: t.space[1] },
});

export function Input({
  label, value, onChangeText, error, hint,
  secureTextEntry, keyboardType, autoFocus, autoCapitalize = 'none',
}: InputProps) {
  const s = useStyles(inputStyles);

  return (
    <View style={s.wrapper}>
      {/* Label above the field, never a placeholder — a placeholder disappears
          exactly when a confused user needs it. */}
      <Text style={s.label}>{label}</Text>

      <TextInput
        accessibilityLabel={label}
        aria-invalid={error !== undefined}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        autoCapitalize={autoCapitalize}
        style={[s.field, error !== undefined && s.fieldInvalid]}
      />

      {error !== undefined
        ? <Text style={s.error}>{error}</Text>
        : hint !== undefined
          ? <Text style={s.hint}>{hint}</Text>
          : null}
    </View>
  );
}
