import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WeightEntry, WeightSettings } from '../types';

const SETTINGS_KEY = 'calisthenics.weight.settings.v1';
const ENTRIES_KEY = 'calisthenics.weight.entries.v1';

/** ISO date string (YYYY-MM-DD) for a given millisecond timestamp. */
export function isoDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse an ISO date string as a local-midnight Date. */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Whole day difference between two ISO dates (b − a). */
export function daysBetween(a: string, b: string): number {
  const ms = parseDate(b).getTime() - parseDate(a).getTime();
  return Math.round(ms / (24 * 3600 * 1000));
}

// ────────────────────────────────────────────────────────────────────────────
// Settings
// ────────────────────────────────────────────────────────────────────────────

export async function getWeightSettings(): Promise<WeightSettings | null> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WeightSettings;
  } catch {
    return null;
  }
}

export async function saveWeightSettings(
  settings: WeightSettings
): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ────────────────────────────────────────────────────────────────────────────
// Entries
// ────────────────────────────────────────────────────────────────────────────

async function readEntries(): Promise<WeightEntry[]> {
  const raw = await AsyncStorage.getItem(ENTRIES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeEntries(list: WeightEntry[]): Promise<void> {
  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(list));
}

export async function listWeightEntries(): Promise<WeightEntry[]> {
  const list = await readEntries();
  return [...list].sort((a, b) => a.date.localeCompare(b.date));
}

/** Insert or update an entry for a given date. */
export async function upsertWeightEntry(
  date: string,
  weight: number,
  note?: string
): Promise<WeightEntry> {
  const list = await readEntries();
  const now = Date.now();
  const idx = list.findIndex((e) => e.date === date);
  const existing = idx >= 0 ? list[idx] : undefined;
  const entry: WeightEntry = {
    date,
    weight,
    note,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  if (idx >= 0) list[idx] = entry;
  else list.push(entry);
  await writeEntries(list);
  return entry;
}

export async function deleteWeightEntry(date: string): Promise<void> {
  const list = await readEntries();
  await writeEntries(list.filter((e) => e.date !== date));
}

// ────────────────────────────────────────────────────────────────────────────
// Planning helpers
// ────────────────────────────────────────────────────────────────────────────

/** Planned weight for a given day index (0 = startDate). */
export function plannedWeightAt(
  settings: WeightSettings,
  dayIndex: number
): number {
  const perDayKg = settings.dailyLossGrams / 1000;
  const planned = settings.startWeight - dayIndex * perDayKg;
  // Never overshoot below the target.
  return Math.max(settings.targetWeight, planned);
}

/** Number of days required (from startDate) to reach the target. */
export function daysToTarget(settings: WeightSettings): number {
  const perDayKg = settings.dailyLossGrams / 1000;
  if (perDayKg <= 0) return 0;
  const diff = settings.startWeight - settings.targetWeight;
  return Math.max(0, Math.ceil(diff / perDayKg));
}
