import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ME, type Filters, type Group, type Store } from '../types';
import { defaultFilters, loadStore, saveStore } from '../lib/store';

interface StoreApi {
  store: Store;
  update: (fn: (s: Store) => Store) => void;
  replace: (s: Store) => void;
  /** false when localStorage is unavailable: progress lasts only for this session. */
  persistent: boolean;
  activeGroup: Group | null;
  activeName: string;
  activeFilters: Filters;
  /** Last card shown or skipped this session, so Next Case avoids it. */
  lastShownRef: React.MutableRefObject<string | null>;
}

const Ctx = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(loadStore, []);
  const [store, setStore] = useState<Store>(initial.store);
  const [persistent, setPersistent] = useState(initial.persistent);
  const lastShownRef = useRef<string | null>(null);

  useEffect(() => {
    if (persistent && !saveStore(store)) setPersistent(false);
  }, [store, persistent]);

  const update = useCallback((fn: (s: Store) => Store) => setStore(fn), []);
  const replace = useCallback((s: Store) => setStore(s), []);

  const activeGroup = store.groups.find((g) => g.id === store.activeProfileId) ?? null;
  const value: StoreApi = {
    store,
    update,
    replace,
    persistent,
    activeGroup,
    activeName: activeGroup?.name ?? 'Me',
    activeFilters: store.filters[store.activeProfileId] ?? defaultFilters(),
    lastShownRef,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside StoreProvider');
  return v;
}

export function newGroup(name: string): Group {
  const id = `g_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const now = Date.now();
  return { id, name, createdAt: now, updatedAt: now, meAlsoPlaying: true };
}

export function addGroup(s: Store, g: Group): Store {
  return {
    ...s,
    groups: [...s.groups, g],
    played: { ...s.played, [g.id]: {} },
    filters: { ...s.filters, [g.id]: defaultFilters() },
  };
}

export function deleteGroup(s: Store, id: string, now = Date.now()): Store {
  const played = { ...s.played };
  const removed = { ...s.removed };
  const filters = { ...s.filters };
  delete played[id];
  delete removed[id];
  delete filters[id];
  return {
    ...s,
    groups: s.groups.filter((g) => g.id !== id),
    played,
    removed,
    filters,
    deletedGroups: { ...s.deletedGroups, [id]: now },
    activeProfileId: s.activeProfileId === id ? ME : s.activeProfileId,
  };
}

export function patchGroup(s: Store, id: string, patch: Partial<Group>, now = Date.now()): Store {
  return { ...s, groups: s.groups.map((g) => (g.id === id ? { ...g, ...patch, updatedAt: now } : g)) };
}
