import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../hooks/useOnboarding';
import { radius, spacing, useThemedStyles } from '../theme';

interface Step {
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    title: '👋 Bienvenue dans le tour !',
    body:
      "On va parcourir l'app ensemble. Tu pilotes, je guide. Tu peux passer à tout moment avec « Passer ». Astuce : touche « ↕ » pour déplacer cette bannière en haut si elle te gêne.",
  },
  {
    title: 'Étape 1 — Switcher de catégorie',
    body:
      "En haut de l'écran tu as les chips de catégories : — Barre, ▢ Tapis, ⤤ Écart… Touche-les pour switcher. Essaye « ⤤ Écart » par exemple. Puis Suivant ↓",
  },
  {
    title: 'Étape 2 — Sélectionner des exercices',
    body:
      "Touche le rond à gauche d'un exercice pour le cocher. Le cadre devient coloré. Coche-en deux ou trois. Puis Suivant ↓",
  },
  {
    title: 'Étape 3 — Tout sélectionner',
    body:
      "Le bouton « Tout sélectionner » en haut à droite coche toute la liste d'un coup. Re-touche pour décocher tout. Suivant ↓",
  },
  {
    title: 'Étape 4 — Lancer la séance',
    body:
      "Quand tu as une sélection, le bouton « Lancer (N) » en bas à droite démarre la séance. Touche-le pour entrer dans le player. Puis Suivant ↓",
  },
  {
    title: 'Étape 5 — Pendant la séance',
    body:
      "La voix dicte les instructions. Tu peux Mettre en pause, Sauter une étape ou un exo, ou Arrêter. Déplie aussi la carte ♪ Musique pour ajouter ton mp3. Touche « Arrêter » puis Suivant ↓",
  },
  {
    title: 'Étape 6 — Onglet Réglages',
    body: "Touche l'onglet ⚙ Réglages en bas. Suivant ↓",
  },
  {
    title: 'Étape 7 — Personnalise',
    body:
      "Ici tu peux : changer la palette (4 ambiances), créer tes propres catégories (chips), créer tes propres modes de comptage (séquences vocales), importer un CSV. Explore. Puis Suivant ↓",
  },
  {
    title: '🎉 Tour terminé',
    body:
      "Tu sais tout faire ! Si tu veux le revoir, va dans Réglages → Aide → « ↻ Revoir le tour ». Bonne séance 💪",
  },
];

const POSITION_KEY = 'calisthenics.onboarding.position.v1';
type Position = 'top' | 'bottom';

export function Onboarding() {
  const { active, ready, stepIndex, next, back, finish } = useOnboarding();
  const [position, setPosition] = useState<Position>('bottom');
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(POSITION_KEY).then((v) => {
      if (v === 'top' || v === 'bottom') setPosition(v);
    });
  }, []);

  const togglePosition = () => {
    const next = position === 'bottom' ? 'top' : 'bottom';
    setPosition(next);
    AsyncStorage.setItem(POSITION_KEY, next).catch(() => undefined);
  };

  const styles = useThemedStyles((c) =>
    StyleSheet.create({
      wrap: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 1000,
        paddingHorizontal: spacing.sm,
      },
      wrapBottom: { bottom: 0, paddingBottom: spacing.sm },
      wrapTop: { top: 0, paddingTop: spacing.sm },
      card: {
        backgroundColor: c.surface,
        borderWidth: 2,
        borderColor: c.accent,
        borderRadius: radius.md,
        padding: spacing.md,
        gap: spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
      },
      cardCollapsed: {
        padding: spacing.sm + 2,
        gap: 0,
      },
      headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      stepLabel: {
        color: c.textMuted,
        fontSize: 11,
        letterSpacing: 1,
        textTransform: 'uppercase',
        fontWeight: '700',
      },
      iconRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
      iconBtn: {
        width: 28,
        height: 28,
        borderRadius: radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.surfaceAlt,
        borderWidth: 1,
        borderColor: c.border,
      },
      iconBtnText: {
        color: c.text,
        fontSize: 14,
        fontWeight: '700',
      },
      skipBtn: { paddingVertical: 4, paddingHorizontal: spacing.sm },
      skipText: { color: c.textMuted, fontSize: 12 },
      title: { color: c.text, fontSize: 16, fontWeight: '700' },
      body: { color: c.text, fontSize: 13, lineHeight: 18 },
      collapsedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
      },
      collapsedTitle: {
        color: c.text,
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
      },
      dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 4,
        marginTop: spacing.xs,
      },
      dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: c.border,
      },
      dotActive: {
        backgroundColor: c.accent,
        width: 16,
      },
      controls: {
        flexDirection: 'row',
        gap: spacing.sm,
      },
      btn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: radius.sm,
        alignItems: 'center',
      },
      btnSecondary: {
        backgroundColor: c.surfaceAlt,
        borderWidth: 1,
        borderColor: c.border,
      },
      btnPrimary: { backgroundColor: c.accent },
      btnSecondaryText: { color: c.text, fontSize: 14, fontWeight: '600' },
      btnPrimaryText: { color: c.accentText, fontSize: 14, fontWeight: '700' },
    })
  );

  if (!ready || !active) return null;
  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const wrapStyle = [
    styles.wrap,
    position === 'bottom' ? styles.wrapBottom : styles.wrapTop,
  ];

  // Collapsed mini-pill with just step counter + expand button.
  if (collapsed) {
    return (
      <SafeAreaView
        style={wrapStyle}
        edges={position === 'bottom' ? ['bottom'] : ['top']}
        pointerEvents="box-none"
      >
        <View style={[styles.card, styles.cardCollapsed]}>
          <View style={styles.collapsedRow}>
            <Text style={styles.stepLabel}>
              Tour · {stepIndex + 1}/{STEPS.length}
            </Text>
            <Text style={styles.collapsedTitle} numberOfLines={1}>
              {step.title}
            </Text>
            <Pressable
              style={styles.iconBtn}
              onPress={() => setCollapsed(false)}
            >
              <Text style={styles.iconBtnText}>↗</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={wrapStyle}
      edges={position === 'bottom' ? ['bottom'] : ['top']}
      pointerEvents="box-none"
    >
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.stepLabel}>
            Tour guidé · {stepIndex + 1} / {STEPS.length}
          </Text>
          <View style={styles.iconRow}>
            <Pressable
              style={styles.iconBtn}
              onPress={togglePosition}
              accessibilityLabel="Déplacer la bannière"
            >
              <Text style={styles.iconBtnText}>↕</Text>
            </Pressable>
            <Pressable
              style={styles.iconBtn}
              onPress={() => setCollapsed(true)}
              accessibilityLabel="Réduire"
            >
              <Text style={styles.iconBtnText}>–</Text>
            </Pressable>
            <Pressable style={styles.skipBtn} onPress={finish}>
              <Text style={styles.skipText}>Passer →</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.body}>{step.body}</Text>

        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === stepIndex && styles.dotActive]}
            />
          ))}
        </View>

        <View style={styles.controls}>
          {stepIndex > 0 && (
            <Pressable
              style={[styles.btn, styles.btnSecondary]}
              onPress={back}
            >
              <Text style={styles.btnSecondaryText}>← Retour</Text>
            </Pressable>
          )}
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={next}>
            <Text style={styles.btnPrimaryText}>
              {isLast ? '🎉 Terminer' : 'Suivant →'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
