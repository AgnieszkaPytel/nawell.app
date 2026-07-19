import { useCallback, useEffect, useState } from 'react';
import {
  deleteCategory,
  duplicateCategory,
  listCategories,
  reorderCategory,
  saveCategory,
  uid,
} from '../storage';
import type { Category } from '../types';

export interface UseCategoriesValue {
  categories: Category[];
  ready: boolean;
  refresh: () => Promise<void>;
  upsert: (input: {
    id?: string;
    name: string;
    emoji?: string;
  }) => Promise<Category>;
  remove: (id: string) => Promise<void>;
  reorder: (id: string, direction: 'up' | 'down') => Promise<void>;
  duplicate: (id: string) => Promise<Category | null>;
}

export function useCategories(): UseCategoriesValue {
  const [categories, setCategories] = useState<Category[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const list = await listCategories();
    setCategories(list);
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upsert = useCallback(
    async ({ id, name, emoji }: { id?: string; name: string; emoji?: string }) => {
      const now = Date.now();
      const existing = id ? categories.find((c) => c.id === id) : undefined;
      const next: Category = {
        id: existing?.id ?? uid(),
        name,
        emoji,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      const saved = await saveCategory(next);
      await refresh();
      return saved;
    },
    [categories, refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteCategory(id);
      await refresh();
    },
    [refresh]
  );

  const reorder = useCallback(
    async (id: string, direction: 'up' | 'down') => {
      await reorderCategory(id, direction);
      await refresh();
    },
    [refresh]
  );

  const duplicate = useCallback(
    async (id: string) => {
      const created = await duplicateCategory(id);
      await refresh();
      return created;
    },
    [refresh]
  );

  return { categories, ready, refresh, upsert, remove, reorder, duplicate };
}
