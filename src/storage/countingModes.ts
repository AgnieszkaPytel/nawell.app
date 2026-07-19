import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CustomCountingMode } from '../types';

const KEY = 'calisthenics.customModes.v1';

async function readAll(): Promise<CustomCountingMode[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(list: CustomCountingMode[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function listCustomCountingModes(): Promise<CustomCountingMode[]> {
  const list = await readAll();
  return [...list].sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveCustomCountingMode(
  mode: CustomCountingMode
): Promise<CustomCountingMode> {
  const list = await readAll();
  const now = Date.now();
  const next: CustomCountingMode = { ...mode, updatedAt: now };
  const idx = list.findIndex((m) => m.id === mode.id);
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  await writeAll(list);
  return next;
}

export async function deleteCustomCountingMode(id: string): Promise<void> {
  const list = await readAll();
  await writeAll(list.filter((m) => m.id !== id));
}
