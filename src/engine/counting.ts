import { PYRAMID8_LABELS, type CountingMode, type CustomCountingMode } from '../types';

/** Generate the sequence of count labels for a given mode and length. */
export function generateCountLabels(
  mode: CountingMode,
  count: number,
  customModes: ReadonlyArray<CustomCountingMode> = []
): ReadonlyArray<string> {
  if (mode === 'silent') return [];
  if (mode === 'pyramid8') return PYRAMID8_LABELS;
  if (mode === 'reverse') {
    return Array.from({ length: count }, (_, i) => String(count - i));
  }
  if (mode === 'linear') {
    return Array.from({ length: count }, (_, i) => String(i + 1));
  }
  // Custom mode lookup by id; fallback to linear if not found.
  const custom = customModes.find((m) => m.id === mode);
  if (custom && custom.labels.length > 0) return custom.labels;
  return Array.from({ length: count }, (_, i) => String(i + 1));
}

/** Effective number of ticks (e.g. seconds at 1 tick/s) for a given mode. */
export function effectiveCount(
  mode: CountingMode,
  fallback: number,
  customModes: ReadonlyArray<CustomCountingMode> = []
): number {
  if (mode === 'silent') return 0;
  if (mode === 'pyramid8') return PYRAMID8_LABELS.length;
  if (mode === 'linear' || mode === 'reverse') return fallback;
  const custom = customModes.find((m) => m.id === mode);
  if (custom && custom.labels.length > 0) return custom.labels.length;
  return fallback;
}

/** Whether a mode forces a fixed number of ticks (locking duration/reps). */
export function isFixedLengthMode(
  mode: CountingMode,
  customModes: ReadonlyArray<CustomCountingMode> = []
): boolean {
  if (mode === 'pyramid8') return true;
  if (mode === 'linear' || mode === 'reverse' || mode === 'silent') return false;
  return customModes.some((m) => m.id === mode);
}
