import { View, Text } from 'react-native';
import { useStyles } from '../../theme/use-styles';
import type { Theme } from '../../theme/tokens';
import { Button } from './Button';

export type EmptyStateProps = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

const emptyStateStyles = (t: Theme) => ({
  wrapper: {
    flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const,
    paddingHorizontal: t.space[6], gap: t.space[4],
  },
  message: { ...t.type.body, fontFamily: t.font.text, color: t.color.stone, textAlign: 'center' as const },
});

/** Illustration-free: a line of explanation and the action that fills it (design system doc §6). */
export function EmptyState({ message, actionLabel, onAction }: EmptyStateProps) {
  const s = useStyles(emptyStateStyles);

  return (
    <View style={s.wrapper}>
      <Text style={s.message}>{message}</Text>
      {actionLabel !== undefined && onAction !== undefined && (
        <Button label={actionLabel} onPress={onAction} />
      )}
    </View>
  );
}
