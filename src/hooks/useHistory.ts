import { useCallback, useEffect, useState } from 'react';

import type {
  GenerateHooksRequest,
  HistoryEntry,
  HookResult,
  RoastCritique,
  CompareHooksResponse,
} from '../types/hooks';

const historyKey = 'virality_ai_history';
const maxHistoryEntries = 20;

const isHistoryEntry = (value: unknown): value is HistoryEntry => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.timestamp === 'number' &&
    typeof record.script === 'string' &&
    typeof record.platform === 'string' &&
    typeof record.tone === 'string' &&
    typeof record.audience === 'string' &&
    typeof record.intensity === 'string' &&
    typeof record.language === 'string' &&
    typeof record.hookWindow === 'number' &&
    (record.mode === 'compare' || Array.isArray(record.hooks))
  );
};

const normalizeHistoryEntry = (entry: HistoryEntry): HistoryEntry => {
  if (!entry.mode) {
    return { ...entry, mode: 'generate' };
  }

  return entry;
};

const readHistory = (): HistoryEntry[] => {
  try {
    const raw = window.localStorage.getItem(historyKey);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;

    return Array.isArray(parsed)
      ? parsed.filter(isHistoryEntry).map(normalizeHistoryEntry)
      : [];
  } catch {
    return [];
  }
};

const writeHistory = (entries: HistoryEntry[]): void => {
  window.localStorage.setItem(historyKey, JSON.stringify(entries));
};

const createId = (): string => {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setEntries(readHistory());
  }, []);

  const saveEntry = useCallback(
    (
      request: GenerateHooksRequest,
      hooks?: HookResult[],
      roast?: RoastCritique,
      compare?: CompareHooksResponse,
    ) => {
      setEntries((currentEntries) => {
        const nextEntries = [
          {
            id: createId(),
            timestamp: Date.now(),
            ...request,
            hooks,
            roast,
            compare,
          },
          ...currentEntries,
        ].slice(0, maxHistoryEntries);

        writeHistory(nextEntries);
        return nextEntries;
      });
    },
    [],
  );

  const deleteEntry = useCallback((id: string) => {
    setEntries((currentEntries) => {
      const nextEntries = currentEntries.filter((entry) => entry.id !== id);

      writeHistory(nextEntries);
      return nextEntries;
    });
  }, []);

  const clearEntries = useCallback(() => {
    writeHistory([]);
    setEntries([]);
  }, []);

  return {
    entries,
    saveEntry,
    deleteEntry,
    clearEntries,
  };
}
