import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../src/components/Button';
import { MusicPlayer } from '../src/components/MusicPlayer';
import { useWorkoutPlayer } from '../src/hooks/useWorkoutPlayer';
import { listExercises } from '../src/storage';
import { spacing, useThemedStyles } from '../src/theme';
import type { Exercise } from '../src/types';

export default function PlayerScreen() {
  const { ids } = useLocalSearchParams<{ ids: string }>();
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const { state, ready, start, pause, resume, skipStep, skipExercise, stop } =
    useWorkoutPlayer();
  const [hasStarted, setHasStarted] = useState(false);

  const styles = useThemedStyles((c) =>
    StyleSheet.create({
      container: { flex: 1, backgroundColor: c.bg },
      loading: {
        color: c.textMuted,
        padding: spacing.lg,
        textAlign: 'center',
      },
      headerSection: {
        padding: spacing.lg,
        alignItems: 'center',
        gap: spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
      },
      counter: { color: c.textMuted, fontSize: 13, letterSpacing: 1 },
      title: { color: c.text, fontSize: 24, fontWeight: '700' },
      description: {
        color: c.textMuted,
        fontSize: 13,
        textAlign: 'center',
        marginTop: spacing.xs,
      },
      mainSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
      },
      instruction: {
        color: c.accent,
        fontSize: 48,
        fontWeight: '800',
        textAlign: 'center',
      },
      repCounter: { color: c.text, fontSize: 20, fontWeight: '600' },
      progressTrack: {
        width: '100%',
        height: 8,
        backgroundColor: c.surface,
        borderRadius: 4,
        overflow: 'hidden',
        marginTop: spacing.md,
      },
      progressFill: { height: '100%', backgroundColor: c.accent },
      timeLabel: { color: c.textMuted, fontSize: 13 },
      controls: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
      finishedWrap: { alignItems: 'center', gap: spacing.md },
      finishedEmoji: { fontSize: 72, color: c.accent },
      finishedTitle: { color: c.text, fontSize: 24, fontWeight: '700' },
    })
  );

  useEffect(() => {
    (async () => {
      const all = await listExercises();
      const wanted = (ids ?? '').split(',').filter(Boolean);
      const ordered = wanted
        .map((id) => all.find((e) => e.id === id))
        .filter((e): e is Exercise => !!e);
      setExercises(ordered);
    })();
  }, [ids]);

  useEffect(() => {
    if (ready && exercises && exercises.length > 0 && !hasStarted) {
      setHasStarted(true);
      start(exercises);
    }
  }, [ready, exercises, hasStarted, start]);

  const progress = useMemo(() => {
    if (state.stepDurationMs === 0) return 0;
    return Math.min(1, state.elapsedInStepMs / state.stepDurationMs);
  }, [state.stepDurationMs, state.elapsedInStepMs]);

  const onStop = () => {
    stop();
    router.back();
  };

  const onDone = () => {
    router.back();
  };

  if (!exercises) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Chargement…</Text>
      </SafeAreaView>
    );
  }

  if (exercises.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Aucun exercice sélectionné.</Text>
        <Button title="Retour" onPress={onDone} style={{ margin: spacing.md }} />
      </SafeAreaView>
    );
  }

  const ex = state.currentExercise;
  const isFinished = state.status === 'finished' || state.status === 'cancelled';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.headerSection}>
        <Text style={styles.counter}>
          Exercice {Math.min(state.exerciseIndex + 1, state.totalExercises)} /{' '}
          {state.totalExercises}
        </Text>
        <Text style={styles.title}>{ex?.name ?? '—'}</Text>
        {ex?.description ? (
          <Text style={styles.description}>{ex.description}</Text>
        ) : null}
      </View>

      <View style={styles.mainSection}>
        {isFinished ? (
          <View style={styles.finishedWrap}>
            <Text style={styles.finishedEmoji}>
              {state.status === 'finished' ? '✓' : '·'}
            </Text>
            <Text style={styles.finishedTitle}>
              {state.status === 'finished' ? 'Séance terminée' : 'Arrêté'}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.instruction}>
              {state.currentInstruction || '…'}
            </Text>
            {ex?.type === 'repetition' && state.currentRepetition > 0 && (
              <Text style={styles.repCounter}>
                Rép. {state.currentRepLabel || state.currentRepetition} ·{' '}
                {state.currentRepetition} / {ex.repetitions}
              </Text>
            )}
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${progress * 100}%` }]}
              />
            </View>
            <Text style={styles.timeLabel}>
              {formatTime(state.elapsedInStepMs)} /{' '}
              {formatTime(state.stepDurationMs)}
            </Text>
          </>
        )}
      </View>

      <MusicPlayer />

      <View style={styles.controls}>
        {isFinished ? (
          <Button title="Retour" onPress={onDone} style={{ flex: 1 }} />
        ) : (
          <>
            <Button
              title="Étape suivante"
              variant="secondary"
              onPress={skipStep}
              style={{ flex: 1 }}
            />
            {state.status === 'paused' ? (
              <Button title="Reprendre" onPress={resume} style={{ flex: 1 }} />
            ) : (
              <Button
                title="Pause"
                variant="secondary"
                onPress={pause}
                style={{ flex: 1 }}
              />
            )}
            <Button
              title="Exo suivant"
              variant="secondary"
              onPress={skipExercise}
              style={{ flex: 1 }}
            />
          </>
        )}
      </View>
      {!isFinished && (
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
          <Button title="Arrêter" variant="danger" onPress={onStop} />
        </View>
      )}
    </SafeAreaView>
  );
}

function formatTime(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}
