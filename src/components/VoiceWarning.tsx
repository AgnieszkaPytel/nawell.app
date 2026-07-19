import { Platform, StyleSheet, Text, View } from 'react-native';
import { useVoiceAvailability } from '../hooks/useVoiceAvailability';
import { radius, spacing, useThemedStyles } from '../theme';

export function VoiceWarning() {
  const { ready, hasFrench } = useVoiceAvailability();
  const styles = useThemedStyles((c) =>
    StyleSheet.create({
      banner: {
        backgroundColor: '#FCEEDF',
        borderColor: c.warn,
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing.sm + 2,
        marginHorizontal: spacing.md,
        marginTop: spacing.sm,
        gap: 4,
      },
      title: { color: '#A35F2D', fontSize: 13, fontWeight: '700' },
      body: { color: c.text, fontSize: 12, lineHeight: 17 },
    })
  );
  if (!ready || hasFrench) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.title}>⚠ Aucune voix française détectée</Text>
      <Text style={styles.body}>
        {Platform.OS === 'web'
          ? 'Le navigateur lit le français avec la voix polonaise par défaut. Sur Windows : Paramètres → Heure et langue → Parole → Ajouter des voix → Français (France), puis recharge la page. Sur mobile (iOS/Android), la voix française est native — utilise plutôt Expo Go.'
          : "Aucune voix française n'est installée sur ce système. Ajoute-en une dans les réglages de ton appareil."}
      </Text>
    </View>
  );
}
