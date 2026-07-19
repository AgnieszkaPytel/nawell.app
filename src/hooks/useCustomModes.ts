import { useCallback, useEffect, useState } from 'react';
import {
  deleteCustomCountingMode,
  listCustomCountingModes,
  saveCustomCountingMode,
  uid,
} from '../storage';
import type { CustomCountingMode } from '../types';

export interface UseCustomModesValue {
  modes: CustomCountingMode[];
  ready: boolean;
  refresh: () => Promise<void>;
  upsert: (input: {
    id?: string;
    name: string;
    labels: string[];
  }) => Promise<CustomCountingMode>;
  remove: (id: string) => Promise<void>;
}

export function useCustomModes(): UseCustomModesValue {
  const [modes, setModes] = useState<CustomCountingMode[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const list = await listCustomCountingModes();
    setModes(list);
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upsert = useCallback(
    async ({
      id,
      name,
      labels,
    }: {
      id?: string;
      name: string;
      labels: string[];
    }) => {
      const now = Date.now();
      const existing = id ? modes.find((m) => m.id === id) : undefined;
      const next: CustomCountingMode = {
        id: existing?.id ?? uid(),
        name,
        labels,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      const saved = await saveCustomCountingMode(next);
      await refresh();
      return saved;
    },
    [modes, refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteCustomCountingMode(id);
      await refresh();
    },
    [refresh]
  );

  return { modes, ready, refresh, upsert, remove };
}
