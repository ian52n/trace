import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Run } from '../models/run';
import curatedData from './curatedRuns.json';

const SAVED_KEY = 'trace.savedIds.v1';
const GENERATED_KEY = 'trace.generated.v1';

const curated = curatedData as Run[];

interface RunStore {
  curated: Run[];
  generated: Run[];
  savedIds: Set<string>;
  /** Generated runs (newest first) followed by the curated atlas. */
  allRuns: Run[];
  savedRuns: Run[];
  isSaved: (run: Run) => boolean;
  toggleSaved: (run: Run) => void;
  addGenerated: (run: Run) => void;
}

const RunStoreContext = createContext<RunStore | null>(null);

export function RunStoreProvider({ children }: { children: ReactNode }) {
  const [generated, setGenerated] = useState<Run[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Hydrate persisted state once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [savedRaw, generatedRaw] = await Promise.all([
          AsyncStorage.getItem(SAVED_KEY),
          AsyncStorage.getItem(GENERATED_KEY),
        ]);
        if (cancelled) return;
        if (savedRaw) {
          const ids = JSON.parse(savedRaw) as string[];
          setSavedIds(new Set(ids));
        }
        if (generatedRaw) {
          const runs = JSON.parse(generatedRaw) as Run[];
          setGenerated(runs);
        }
      } catch {
        // Corrupt/empty storage — start clean rather than crash.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allRuns = useMemo<Run[]>(() => {
    const sortedGenerated = [...generated].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
    return [...sortedGenerated, ...curated];
  }, [generated]);

  const savedRuns = useMemo<Run[]>(
    () => allRuns.filter((run) => savedIds.has(run.id)),
    [allRuns, savedIds]
  );

  const store = useMemo<RunStore>(() => {
    const persistSaved = (ids: Set<string>) =>
      AsyncStorage.setItem(SAVED_KEY, JSON.stringify([...ids])).catch(() => {});
    const persistGenerated = (runs: Run[]) =>
      AsyncStorage.setItem(GENERATED_KEY, JSON.stringify(runs)).catch(() => {});

    return {
      curated,
      generated,
      savedIds,
      allRuns,
      savedRuns,
      isSaved: (run) => savedIds.has(run.id),
      toggleSaved: (run) => {
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (next.has(run.id)) next.delete(run.id);
          else next.add(run.id);
          persistSaved(next);
          return next;
        });
      },
      addGenerated: (run) => {
        setGenerated((prev) => {
          const next = [run, ...prev];
          persistGenerated(next);
          return next;
        });
      },
    };
  }, [generated, savedIds, allRuns, savedRuns]);

  return (
    <RunStoreContext.Provider value={store}>
      {children}
    </RunStoreContext.Provider>
  );
}

export function useRunStore(): RunStore {
  const store = useContext(RunStoreContext);
  if (!store) {
    throw new Error('useRunStore must be used within a RunStoreProvider');
  }
  return store;
}
