import { DECKS, DIFFICULTIES, ME, type Deck, type Difficulty, type Filters, type Store } from '../types';

export const STORAGE_KEY = 'ctc:v1';
export const SCHEMA_VERSION = 1;

export const defaultFilters = (): Filters => ({ difficulties: [...DIFFICULTIES], decks: [...DECKS] });

export function defaultStore(): Store {
  return {
    schemaVersion: 1,
    activeProfileId: ME,
    groups: [],
    played: { [ME]: {} },
    filters: { [ME]: defaultFilters() },
    libraryPrefs: { status: 'all', sort: 'number', ...defaultFilters() },
    settings: { confirmClues: true, theme: 'system', textSize: 'normal' },
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function cleanFilters(v: unknown): Filters {
  const d = defaultFilters();
  if (!isObj(v)) return d;
  const difficulties = Array.isArray(v.difficulties)
    ? DIFFICULTIES.filter((x) => (v.difficulties as unknown[]).includes(x))
    : [];
  const decks = Array.isArray(v.decks) ? DECKS.filter((x) => (v.decks as unknown[]).includes(x)) : [];
  return {
    difficulties: difficulties.length ? (difficulties as Difficulty[]) : d.difficulties,
    decks: decks.length ? (decks as Deck[]) : d.decks,
  };
}

/**
 * Brings any stored shape up to the current schema. Add a case per future version:
 * e.g. `if (version === 1) { raw = upgrade1to2(raw); version = 2; }`.
 */
export function migrate(input: unknown): Store {
  if (!isObj(input)) return defaultStore();
  const version = typeof input.schemaVersion === 'number' ? input.schemaVersion : 0;
  if (version > SCHEMA_VERSION) throw new Error('This progress file is from a newer version of the app.');
  // version 0 → 1: nothing to transform; normalization below fills gaps.
  return normalize(input);
}

/** Fills missing fields with defaults and drops anything malformed. */
function normalize(raw: Record<string, unknown>): Store {
  const base = defaultStore();
  const groups = Array.isArray(raw.groups)
    ? raw.groups.filter(isObj).filter((g) => typeof g.id === 'string' && typeof g.name === 'string').map((g) => ({
        id: g.id as string,
        name: g.name as string,
        createdAt: typeof g.createdAt === 'number' ? g.createdAt : Date.now(),
        meAlsoPlaying: g.meAlsoPlaying !== false,
      }))
    : [];
  const profileIds = new Set([ME, ...groups.map((g) => g.id)]);

  const played: Store['played'] = { [ME]: {} };
  if (isObj(raw.played)) {
    for (const [pid, recs] of Object.entries(raw.played)) {
      if (!profileIds.has(pid) || !isObj(recs)) continue;
      played[pid] = {};
      for (const [cid, r] of Object.entries(recs)) {
        if (!isObj(r) || typeof r.playedAt !== 'number') continue;
        const points = [0, 4, 5, 6].includes(r.points as number) ? (r.points as 0 | 4 | 5 | 6) : null;
        played[pid]![cid] = {
          playedAt: r.playedAt,
          points,
          ...(typeof r.effectiveSec === 'number' ? { effectiveSec: r.effectiveSec } : {}),
          ...(typeof r.cluesUsed === 'number' ? { cluesUsed: r.cluesUsed } : {}),
        };
      }
    }
  }

  const filters: Store['filters'] = {};
  for (const pid of profileIds) filters[pid] = cleanFilters(isObj(raw.filters) ? raw.filters[pid] : undefined);

  const lp = isObj(raw.libraryPrefs) ? raw.libraryPrefs : {};
  const s = isObj(raw.settings) ? raw.settings : {};
  const store: Store = {
    schemaVersion: 1,
    activeProfileId: typeof raw.activeProfileId === 'string' && profileIds.has(raw.activeProfileId) ? raw.activeProfileId : ME,
    groups,
    played,
    filters,
    libraryPrefs: {
      ...cleanFilters(lp),
      status: ['all', 'unplayed', 'played'].includes(lp.status as string) ? (lp.status as Store['libraryPrefs']['status']) : 'all',
      sort: ['number', 'title', 'recent'].includes(lp.sort as string) ? (lp.sort as Store['libraryPrefs']['sort']) : 'number',
    },
    settings: {
      confirmClues: s.confirmClues !== false,
      theme: ['system', 'light', 'dark'].includes(s.theme as string) ? (s.theme as Store['settings']['theme']) : base.settings.theme,
      textSize: s.textSize === 'large' ? 'large' : 'normal',
    },
  };
  const c = raw.activeClock;
  if (isObj(c) && typeof c.cardId === 'string' && typeof c.accumulatedMs === 'number') {
    const cr = Array.isArray(c.cluesRevealed) ? c.cluesRevealed : [];
    store.activeClock = {
      cardId: c.cardId,
      startedAt: typeof c.startedAt === 'number' ? c.startedAt : null,
      accumulatedMs: c.accumulatedMs,
      running: c.running === true && typeof c.startedAt === 'number',
      penaltyMin: typeof c.penaltyMin === 'number' ? c.penaltyMin : 0,
      cluesRevealed: [cr[0] === true, cr[1] === true],
    };
  }
  return store;
}

/** Validates an imported file. Throws a readable error when it isn't a progress file. */
export function parseImport(text: string): Store {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file isn’t valid JSON.');
  }
  if (!isObj(data) || typeof data.schemaVersion !== 'number' || !isObj(data.played) || !Array.isArray(data.groups)) {
    throw new Error('That file doesn’t look like Crack the Case progress.');
  }
  return migrate(data);
}

export interface LoadResult {
  store: Store;
  persistent: boolean;
}

export function loadStore(): LoadResult {
  try {
    const probe = '__ctc_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    const text = localStorage.getItem(STORAGE_KEY);
    return { store: text ? migrate(JSON.parse(text)) : defaultStore(), persistent: true };
  } catch {
    return { store: defaultStore(), persistent: false };
  }
}

export function saveStore(store: Store): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}
