import { ME, type Group, type PlayedRecord, type Store } from '../types';
import { defaultFilters } from './store';

export interface MergeSummary {
  /** Per profile, how many cards became played or unplayed on this device. */
  played: { name: string; added: number; removed: number }[];
  groupsAdded: string[];
  /** Groups created separately on each device that were joined because their names match. */
  groupsMatched: string[];
  groupsRenamed: string[];
  /** Local groups removed because the other device deleted them. */
  groupsDeleted: string[];
  changed: boolean;
}

const norm = (name: string) => name.trim().toLowerCase();

/** JSON with sorted keys, so maps built in a different order still compare equal. */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
}

/** The parts of the store that merging syncs (empty per-profile maps don't count). */
function syncedData(s: Store): string {
  const nonEmpty = <T,>(m: { [k: string]: { [c: string]: T } }) => Object.fromEntries(Object.entries(m).filter(([, v]) => Object.keys(v).length));
  return stable({
    groups: [...s.groups].sort((a, b) => a.id.localeCompare(b.id)),
    played: nonEmpty(s.played),
    removed: nonEmpty(s.removed),
    deletedGroups: s.deletedGroups,
  });
}

/** Renames a group id everywhere it appears. */
function rekey(s: Store, from: string, to: string): Store {
  if (from === to) return s;
  const move = <T,>(m: { [k: string]: T }) => {
    if (!(from in m)) return m;
    const { [from]: v, ...rest } = m;
    return { ...rest, [to]: v as T };
  };
  return {
    ...s,
    groups: s.groups.map((g) => (g.id === from ? { ...g, id: to } : g)),
    played: move(s.played),
    removed: move(s.removed),
    filters: move(s.filters),
    activeProfileId: s.activeProfileId === from ? to : s.activeProfileId,
  };
}

/**
 * Merges another device's progress into this one. Played history and groups are combined
 * (newest change wins, removals included); this device keeps its own filters, settings,
 * active profile and running clock.
 */
export function mergeStores(localIn: Store, incomingIn: Store): { store: Store; summary: MergeSummary } {
  let local = localIn;
  let incoming = incomingIn;

  // Deletions win over everything: a deleted group id never comes back.
  const deletedGroups = { ...local.deletedGroups };
  for (const [id, t] of Object.entries(incoming.deletedGroups)) deletedGroups[id] = Math.max(t, deletedGroups[id] ?? 0);
  const alive = (g: Group) => !(g.id in deletedGroups);

  // Join same-named groups created separately; both sides adopt the smaller id so they converge.
  const groupsMatched: string[] = [];
  const localIds = new Set(local.groups.map((g) => g.id));
  const incomingIds = new Set(incoming.groups.map((g) => g.id));
  const taken = new Set<string>();
  for (const ig of incoming.groups.filter(alive)) {
    if (localIds.has(ig.id)) continue;
    const lg = local.groups.find(
      (g) => alive(g) && !incomingIds.has(g.id) && !taken.has(g.id) && norm(g.name) === norm(ig.name),
    );
    if (!lg) continue;
    taken.add(lg.id);
    const id = lg.id < ig.id ? lg.id : ig.id;
    local = rekey(local, lg.id, id);
    incoming = rekey(incoming, ig.id, id);
    // Same group under two ids: keep this device's name and toggle rather than treating it as an edit.
    incoming = { ...incoming, groups: incoming.groups.map((g) => (g.id === id ? { ...g, name: lg.name, meAlsoPlaying: lg.meAlsoPlaying, updatedAt: lg.updatedAt } : g)) };
    groupsMatched.push(lg.name);
  }

  // Groups: union; for groups on both sides, the most recent edit wins.
  const byId = new Map<string, Group>();
  for (const g of local.groups.filter(alive)) byId.set(g.id, g);
  for (const g of incoming.groups.filter(alive)) {
    const mine = byId.get(g.id);
    if (!mine) byId.set(g.id, g);
    else {
      const newer = g.updatedAt > mine.updatedAt ? g : mine;
      byId.set(g.id, { ...newer, createdAt: Math.min(mine.createdAt, g.createdAt) });
    }
  }
  const groups = [...byId.values()];
  const profiles = [ME, ...groups.map((g) => g.id)];

  // Played: per profile and card, the newest event (played or removed) wins. Ties keep a play.
  const played: Store['played'] = {};
  const removed: Store['removed'] = {};
  for (const pid of profiles) {
    const sides = [local, incoming];
    const cardIds = new Set(sides.flatMap((s) => [...Object.keys(s.played[pid] ?? {}), ...Object.keys(s.removed[pid] ?? {})]));
    played[pid] = {};
    for (const cid of cardIds) {
      let best: PlayedRecord | null = null;
      let removedAt = 0;
      for (const s of sides) {
        const r = s.played[pid]?.[cid];
        if (r && (!best || r.playedAt > best.playedAt)) best = r;
        removedAt = Math.max(removedAt, s.removed[pid]?.[cid] ?? 0);
      }
      if (best && best.playedAt >= removedAt) played[pid]![cid] = best;
      else (removed[pid] ??= {})[cid] = removedAt;
    }
  }

  const filters: Store['filters'] = {};
  for (const pid of profiles) filters[pid] = local.filters[pid] ?? incoming.filters[pid] ?? defaultFilters();

  const store: Store = {
    ...local,
    groups,
    played,
    removed,
    deletedGroups,
    filters,
    activeProfileId: profiles.includes(local.activeProfileId) ? local.activeProfileId : ME,
  };

  // Summary, measured against this device (after id joining, so matched groups compare cleanly).
  const nameOf = (pid: string) => (pid === ME ? 'Me' : byId.get(pid)?.name ?? pid);
  const playedSummary = profiles
    .map((pid) => {
      const before = local.played[pid] ?? {};
      const after = played[pid] ?? {};
      return {
        name: nameOf(pid),
        added: Object.keys(after).filter((c) => !before[c]).length,
        removed: Object.keys(before).filter((c) => !after[c]).length,
      };
    })
    .filter((p) => p.added || p.removed);
  const localGroups = new Map(local.groups.map((g) => [g.id, g]));
  const summary: MergeSummary = {
    played: playedSummary,
    groupsAdded: groups.filter((g) => !localGroups.has(g.id)).map((g) => g.name),
    groupsMatched,
    groupsRenamed: groups
      .filter((g) => localGroups.has(g.id) && localGroups.get(g.id)!.name !== g.name)
      .map((g) => `${localGroups.get(g.id)!.name} → ${g.name}`),
    groupsDeleted: local.groups.filter((g) => !byId.has(g.id)).map((g) => g.name),
    changed: false,
  };
  summary.changed = syncedData(store) !== syncedData(localIn);
  return { store, summary };
}
