import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useStyles } from '../../theme/use-styles';
import type { Theme } from '../../theme/tokens';

export type SelectOption = { value: string; label: string };

export type SelectFieldProps = {
  label: string;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
  error?: string;
};

const selectStyles = (t: Theme) => ({
  wrapper: { marginBottom: t.space[4] },
  label: {
    ...t.type.label, fontFamily: t.font.sign, textTransform: 'uppercase' as const,
    color: t.color.stone, marginBottom: t.space[2],
  },
  field: {
    minHeight: 48, flexDirection: 'row' as const, alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    borderRadius: t.radius.base, borderWidth: 1, borderColor: t.color.stone,
    backgroundColor: t.color.surface, paddingHorizontal: t.space[3],
  },
  fieldInvalid: { borderColor: t.color.brick },
  valueText: { ...t.type.bodyLg, fontFamily: t.font.text, color: t.color.ink },
  placeholderText: { ...t.type.bodyLg, fontFamily: t.font.text, color: t.color.stone },
  chevron: { ...t.type.body, fontFamily: t.font.text, color: t.color.stone },
  options: {
    borderRadius: t.radius.base, borderWidth: 1, borderColor: t.color.stone,
    backgroundColor: t.color.surface, marginTop: t.space[1], overflow: 'hidden' as const,
  },
  option: { minHeight: 48, justifyContent: 'center' as const, paddingHorizontal: t.space[3] },
  optionSelected: { backgroundColor: t.color.paper },
  optionText: { ...t.type.body, fontFamily: t.font.text, color: t.color.ink },
  error: { ...t.type.caption, fontFamily: t.font.text, color: t.color.brick, marginTop: t.space[1] },
});

/**
 * Design system's `Select` spec calls for a bottom sheet (§6) — the `Sheet` primitive
 * doesn't exist yet, and pulling it in for one field is more than this screen needs.
 * This is a functional stand-in: an inline expandable list. Swap for the real thing
 * once `Sheet` exists rather than building gesture-dismiss/focus-trap machinery here.
 */
export function SelectField({ label, value, options, onChange, error }: SelectFieldProps) {
  const s = useStyles(selectStyles);
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value) ?? null;

  return (
    <View style={s.wrapper}>
      <Text style={s.label}>{label}</Text>
      <Pressable
        style={[s.field, error !== undefined && s.fieldInvalid]}
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={selected ? { text: selected.label } : undefined}
      >
        <Text style={selected ? s.valueText : s.placeholderText}>
          {selected?.label ?? 'Select…'}
        </Text>
        <Text style={s.chevron}>{open ? '▲' : '▼'}</Text>
      </Pressable>

      {open && (
        <View style={s.options}>
          {options.map((option) => (
            <Pressable
              key={option.value}
              style={[s.option, option.value === value && s.optionSelected]}
              onPress={() => { onChange(option.value); setOpen(false); }}
              accessibilityRole="button"
              accessibilityLabel={option.label}
            >
              <Text style={s.optionText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {error !== undefined && <Text style={s.error}>{error}</Text>}
    </View>
  );
}
