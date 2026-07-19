import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  PALETTE_LABELS,
  radius,
  spacing,
  useTheme,
  useThemedStyles,
  type PaletteName,
} from '../theme';

const ORDER: PaletteName[] = ['rose', 'pop', 'graphite', 'storm'];

export function PaletteSwitcher() {
  const { name, setPalette } = useTheme();
  const styles = useThemedStyles((c) =>
    StyleSheet.create({
      row: { flexDirection: 'row', gap: spacing.xs },
      chip: {
        paddingVertical: 4,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.sm,
        backgroundColor: c.surfaceAlt,
        borderWidth: 1,
        borderColor: c.border,
      },
      chipActive: {
        backgroundColor: c.accent,
        borderColor: c.accent,
      },
      chipText: { color: c.text, fontSize: 11, fontWeight: '500' },
      chipTextActive: { color: c.accentText, fontWeight: '700' },
    })
  );

  return (
    <View style={styles.row}>
      {ORDER.map((p) => {
        const active = p === name;
        return (
          <Pressable
            key={p}
            onPress={() => setPalette(p)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {PALETTE_LABELS[p]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
