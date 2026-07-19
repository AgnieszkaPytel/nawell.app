import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { radius, spacing, useTheme, type Palette } from '../theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
}

const backgroundFor = (v: Variant, disabled: boolean, c: Palette) => {
  if (disabled) return c.surfaceAlt;
  switch (v) {
    case 'primary':
      return c.accent;
    case 'secondary':
      return c.surfaceAlt;
    case 'danger':
      return c.danger;
    case 'ghost':
      return 'transparent';
  }
};

const colorFor = (v: Variant, disabled: boolean, c: Palette) => {
  if (disabled) return c.textMuted;
  if (v === 'primary') return c.accentText;
  if (v === 'danger') return c.accentText;
  return c.text;
};

export function Button({ title, onPress, variant = 'primary', disabled, style }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: backgroundFor(variant, !!disabled, colors), opacity: pressed ? 0.85 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}
    >
      <Text style={[styles.text, { color: colorFor(variant, !!disabled, colors) }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
