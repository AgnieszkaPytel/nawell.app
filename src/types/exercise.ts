export type Language = 'fr' | 'en';
export type VoiceGender = 'male' | 'female';

/**
 * Counting mode identifier. Built-in values:
 * - 'linear':   1, 2, 3, ..., N
 * - 'reverse':  N, N-1, ..., 1
 * - 'pyramid8': 1,2,3,4,5,6,7,8,8,7,6,5,4,3,2,1 (16 counts, fixed)
 *
 * Any other string is treated as a *custom mode id*. The labels for that id
 * are looked up in the user-defined modes registry (`CustomCountingMode`).
 */
export type CountingMode = string;

export const BUILTIN_COUNTING_MODES = ['linear', 'reverse', 'pyramid8'] as const;
export type BuiltinCountingMode = (typeof BUILTIN_COUNTING_MODES)[number];

export interface CustomCountingMode {
  id: string;
  name: string;
  /** Spoken labels in order. Length determines how many ticks the mode produces. */
  labels: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Step {
  id: string;
  instruction: string;
  duration: number;
  /** Internal counting mode during this step. 'none' = no count, default 'none'. */
  internalCount: 'none' | CountingMode;
}

/**
 * Category id. Built-ins ('bar', 'mat', 'splits') are seeded automatically;
 * any other id is a user-defined category stored in the categories registry.
 */
export type ExerciseCategory = string;

export interface Category {
  id: string;
  name: string;
  emoji?: string;
  /** Manual ordering. When absent, falls back to createdAt. */
  order?: number;
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_CATEGORIES: ReadonlyArray<Category> = [
  { id: 'bar', name: 'Pole dance', emoji: '💃', createdAt: 1, updatedAt: 1 },
  { id: 'mat', name: 'Tapis', emoji: '🪷', createdAt: 2, updatedAt: 2 },
  { id: 'splits', name: 'Écart latéral', emoji: '🦋', createdAt: 3, updatedAt: 3 },
  { id: 'front-splits', name: 'Écart facial', emoji: '🤸', createdAt: 4, updatedAt: 4 },
  { id: 'postpartum', name: 'Post-partum', emoji: '🌸', createdAt: 5, updatedAt: 5 },
  { id: 'arms', name: 'Bras (ouverture/renfo)', emoji: '💪', createdAt: 6, updatedAt: 6 },
  { id: 'pilates', name: 'Pilates', emoji: '🧘', createdAt: 7, updatedAt: 7 },
  { id: 'yoga', name: 'Yoga', emoji: '🕉', createdAt: 8, updatedAt: 8 },
  { id: 'face-yoga', name: 'Yoga du visage', emoji: '😊', createdAt: 9, updatedAt: 9 },
  { id: 'tre', name: 'TRE', emoji: '🌀', createdAt: 10, updatedAt: 10 },
];

export interface BaseExercise {
  id: string;
  name: string;
  description: string;
  variants?: string[];
  /** Where the exercise is performed. Defaults to 'mat' when missing. */
  category: ExerciseCategory;
  createdAt: number;
  updatedAt: number;
}

export interface TimeExercise extends BaseExercise {
  type: 'time';
  /** Total duration in seconds. Ignored when countingMode === 'pyramid8' (forced to 16). */
  duration: number;
  /** Counts per second (default 1). Ignored when countingMode === 'pyramid8'. */
  pace: number;
  /** How counts are vocalised. Default 'linear'. */
  countingMode: CountingMode;
}

export interface RepetitionExercise extends BaseExercise {
  type: 'repetition';
  /** Number of repetitions. Forced to 16 when repCountingMode === 'pyramid8'. */
  repetitions: number;
  /** How rep numbers are vocalised. Default 'linear'. */
  repCountingMode: CountingMode;
  steps: Step[];
}

export type Exercise = TimeExercise | RepetitionExercise;

export interface WorkoutSession {
  id: string;
  exerciseIds: string[];
  startedAt: number;
  finishedAt?: number;
}

export interface VoiceSettings {
  language: Language;
  gender: VoiceGender;
  rate: number;
}

export const PYRAMID8_LABELS: ReadonlyArray<string> = [
  '1', '2', '3', '4', '5', '6', '7', '8',
  '8', '7', '6', '5', '4', '3', '2', '1',
];
