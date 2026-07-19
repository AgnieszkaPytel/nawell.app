import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_CATEGORIES,
  type Category,
  type Exercise,
} from '../types';
import { listExercisesByCategory, saveExercise } from './exercises';
import { uid } from './ids';

const KEY = 'calisthenics.categories.v1';
const SEED_KEY = 'calisthenics.categories.seeded.v1';

async function readAll(): Promise<Category[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(list: Category[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

/** Make sure the default built-in categories exist. Idempotent. */
export async function ensureDefaultCategories(): Promise<void> {
  const seeded = await AsyncStorage.getItem(SEED_KEY);
  if (seeded) {
    // Even after seeding, make sure built-ins still exist (user may have deleted them).
    const list = await readAll();
    let changed = false;
    for (const def of DEFAULT_CATEGORIES) {
      if (!list.some((c) => c.id === def.id)) {
        list.push({ ...def });
        changed = true;
      }
    }
    if (changed) await writeAll(list);
    return;
  }
  const list = await readAll();
  for (const def of DEFAULT_CATEGORIES) {
    if (!list.some((c) => c.id === def.id)) list.push({ ...def });
  }
  await writeAll(list);
  await AsyncStorage.setItem(SEED_KEY, '1');
}

export async function listCategories(): Promise<Category[]> {
  await ensureDefaultCategories();
  const list = await readAll();
  return [...list].sort((a, b) => {
    const ao = a.order ?? a.createdAt;
    const bo = b.order ?? b.createdAt;
    if (ao !== bo) return ao - bo;
    return a.createdAt - b.createdAt;
  });
}

/** Swap order with the previous (or next) sibling in the current sort. */
export async function reorderCategory(
  id: string,
  direction: 'up' | 'down'
): Promise<void> {
  const list = await listCategories();
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return;
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= list.length) return;
  const a = list[idx];
  const b = list[targetIdx];
  const orderA = a.order ?? a.createdAt;
  const orderB = b.order ?? b.createdAt;
  await saveCategory({ ...a, order: orderB });
  await saveCategory({ ...b, order: orderA });
}

/**
 * Compute a unique "X (copie)" / "X (copie 2)" name based on existing categories.
 */
export function uniqueCopyName(
  baseName: string,
  existing: ReadonlyArray<{ name: string }>
): string {
  const candidate = `${baseName} (copie)`;
  if (!existing.some((c) => c.name === candidate)) return candidate;
  for (let i = 2; i < 100; i++) {
    const tryName = `${baseName} (copie ${i})`;
    if (!existing.some((c) => c.name === tryName)) return tryName;
  }
  return `${baseName} (copie ${Date.now()})`;
}

/**
 * Find exercises whose `category` id doesn't match any existing Category.
 * Returns a map: orphanCategoryId -> count.
 */
export async function findOrphanExercises(): Promise<{
  orphanCounts: Record<string, number>;
  totalOrphans: number;
}> {
  const cats = await listCategories();
  const exos = await listExercisesByCategory.length /* dummy to use import */;
  void exos;
  const { listExercises } = await import('./exercises');
  const all = await listExercises();
  const catIds = new Set(cats.map((c) => c.id));
  const orphanCounts: Record<string, number> = {};
  for (const e of all) {
    const cat = e.category ?? 'mat';
    if (!catIds.has(cat)) {
      orphanCounts[cat] = (orphanCounts[cat] ?? 0) + 1;
    }
  }
  const totalOrphans = Object.values(orphanCounts).reduce(
    (s, n) => s + n,
    0
  );
  return { orphanCounts, totalOrphans };
}

/**
 * Recover orphaned exercises by re-creating the categories they reference.
 * - Built-in ids (bar, mat, splits) get the default name + emoji.
 * - Unknown ids get a "Récupérés (xxx)" name.
 * Returns the number of categories created.
 */
export async function repairOrphans(): Promise<number> {
  const { orphanCounts } = await findOrphanExercises();
  const orphanIds = Object.keys(orphanCounts);
  if (orphanIds.length === 0) return 0;

  const list = await readAll();
  const now = Date.now();
  let createdCount = 0;
  for (const id of orphanIds) {
    if (list.some((c) => c.id === id)) continue;
    const def = DEFAULT_CATEGORIES.find((d) => d.id === id);
    const newCat: Category = def
      ? { ...def, createdAt: now, updatedAt: now }
      : {
          id,
          name: `Récupérés (${id.slice(0, 6)})`,
          emoji: '✺',
          createdAt: now,
          updatedAt: now,
        };
    list.push(newCat);
    createdCount += 1;
  }
  await writeAll(list);
  return createdCount;
}

/**
 * Migrate every exercise of `fromId` into `toId`. Useful before deleting a
 * category to avoid orphaning its content.
 */
export async function migrateExercisesCategory(
  fromId: string,
  toId: string
): Promise<number> {
  const { listExercises, saveExercise } = await import('./exercises');
  const all = await listExercises();
  let count = 0;
  for (const ex of all) {
    if ((ex.category ?? 'mat') === fromId) {
      await saveExercise({ ...ex, category: toId });
      count += 1;
    }
  }
  return count;
}

/**
 * Duplicate an existing category and all its exercises. The new category gets
 * a unique "(copie)" name, the same emoji, an order placed right after the
 * source, and a fresh id. Each exercise is cloned with new ids.
 */
export async function duplicateCategory(
  sourceId: string
): Promise<Category | null> {
  const list = await listCategories();
  const sourceIdx = list.findIndex((c) => c.id === sourceId);
  if (sourceIdx === -1) return null;
  const source = list[sourceIdx];

  const now = Date.now();
  const sourceOrder = source.order ?? source.createdAt;
  const next = list[sourceIdx + 1];
  const nextOrder = next ? next.order ?? next.createdAt : sourceOrder + 1;
  const newOrder = (sourceOrder + nextOrder) / 2;

  const copy: Category = {
    id: uid(),
    name: uniqueCopyName(source.name, list),
    emoji: source.emoji,
    order: newOrder,
    createdAt: now,
    updatedAt: now,
  };
  await saveCategory(copy);

  const sourceExercises = await listExercisesByCategory(sourceId);
  let stamp = now;
  for (const ex of sourceExercises) {
    stamp += 1;
    const cloned: Exercise = {
      ...ex,
      id: uid(),
      category: copy.id,
      createdAt: stamp,
      updatedAt: stamp,
      // For repetition exercises, also give each step a fresh id.
      ...(ex.type === 'repetition'
        ? {
            steps: ex.steps.map((s) => ({ ...s, id: uid() })),
          }
        : {}),
    };
    await saveExercise(cloned);
  }
  return copy;
}

export async function saveCategory(category: Category): Promise<Category> {
  const list = await readAll();
  const now = Date.now();
  const next: Category = { ...category, updatedAt: now };
  const idx = list.findIndex((c) => c.id === category.id);
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  await writeAll(list);
  return next;
}

export async function deleteCategory(id: string): Promise<void> {
  const list = await readAll();
  await writeAll(list.filter((c) => c.id !== id));
}
