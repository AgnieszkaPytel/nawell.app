import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Exercise, ExerciseCategory } from '../types';

const KEY = 'calisthenics.exercises.v1';

async function readAll(): Promise<Exercise[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(list: Exercise[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function listExercises(): Promise<Exercise[]> {
  const list = await readAll();
  return [...list].sort((a, b) => a.createdAt - b.createdAt);
}

export async function listExercisesByCategory(
  category: ExerciseCategory
): Promise<Exercise[]> {
  const list = await listExercises();
  return list.filter((e) => (e.category ?? 'mat') === category);
}

export async function getExercise(id: string): Promise<Exercise | null> {
  const list = await readAll();
  return list.find((e) => e.id === id) ?? null;
}

export async function saveExercise(exercise: Exercise): Promise<Exercise> {
  const list = await readAll();
  const now = Date.now();
  const next: Exercise = { ...exercise, updatedAt: now };
  const idx = list.findIndex((e) => e.id === exercise.id);
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  await writeAll(list);
  return next;
}

export async function deleteExercise(id: string): Promise<void> {
  const list = await readAll();
  await writeAll(list.filter((e) => e.id !== id));
}
