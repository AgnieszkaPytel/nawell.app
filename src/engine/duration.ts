import type { CustomCountingMode, Exercise } from '../types';
import { effectiveCount } from './counting';

/** Approx. announcement time when entering a new exercise (speech of the name). */
const EXERCISE_ANNOUNCE_S = 1.5;
/** Approx. announcement time when entering a new repetition (speech of the rep label). */
const REP_ANNOUNCE_S = 0.7;

/**
 * Estimated total duration (in seconds) of a single exercise, taking custom
 * modes into account. Mirrors the actual scheduling done by `WorkoutPlayer`.
 */
export function exerciseDurationSeconds(
  ex: Exercise,
  customModes: ReadonlyArray<CustomCountingMode> = []
): number {
  if (ex.type === 'time') {
    const mode = ex.countingMode ?? 'linear';
    if (mode === 'silent') {
      return EXERCISE_ANNOUNCE_S + ex.duration;
    }
    const totalCount = effectiveCount(mode, ex.duration, customModes);
    const intervalSeconds =
      mode === 'pyramid8' ? 1 : Math.max(0.25, 1 / Math.max(0.25, ex.pace));
    return EXERCISE_ANNOUNCE_S + totalCount * intervalSeconds;
  }
  // Repetition
  const repMode = ex.repCountingMode ?? 'linear';
  const totalReps = effectiveCount(repMode, ex.repetitions, customModes);
  const stepsTotal = ex.steps.reduce((sum, s) => sum + s.duration, 0);
  return EXERCISE_ANNOUNCE_S + totalReps * (REP_ANNOUNCE_S + stepsTotal);
}

/** Sum of `exerciseDurationSeconds` over a list. */
export function totalDurationSeconds(
  exercises: ReadonlyArray<Exercise>,
  customModes: ReadonlyArray<CustomCountingMode> = []
): number {
  return exercises.reduce(
    (sum, ex) => sum + exerciseDurationSeconds(ex, customModes),
    0
  );
}

/**
 * Format a duration as a compact human-readable string.
 *  - < 60s  -> "42s"
 *  - < 1h   -> "12 min 30"
 *  - >= 1h  -> "1 h 04 min"
 */
export function formatDurationCompact(totalSeconds: number): string {
  const s = Math.round(totalSeconds);
  if (s < 60) return `${s}s`;
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  if (minutes < 60) {
    return seconds === 0
      ? `${minutes} min`
      : `${minutes} min ${seconds.toString().padStart(2, '0')}`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0
    ? `${hours} h`
    : `${hours} h ${mins.toString().padStart(2, '0')} min`;
}
