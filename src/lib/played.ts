import { ME, type PlayedRecord, type Points, type RemovedMap, type Store } from '../types';

/** Drops the removal marker for a card that is being marked played again. */
function clearRemoved(removed: RemovedMap, pid: string, cardId: string): RemovedMap {
  if (!removed[pid]?.[cardId]) return removed;
  const forProfile = { ...removed[pid] };
  delete forProfile[cardId];
  return { ...removed, [pid]: forProfile };
}

/** Profiles that a finished case is credited to, per the "I'm playing too" rule. */
export function finishTargets(store: Store): string[] {
  if (store.activeProfileId === ME) return [ME];
  const group = store.groups.find((g) => g.id === store.activeProfileId);
  if (!group) return [ME];
  return group.meAlsoPlaying ? [group.id, ME] : [group.id];
}

/** Solved or Gave up. Skip must never call this. */
export function markFinished(
  store: Store,
  cardId: string,
  points: Points,
  now: number,
  extra: Pick<PlayedRecord, 'effectiveSec' | 'cluesUsed'> = {},
): Store {
  const played = { ...store.played };
  let removed = store.removed;
  for (const pid of finishTargets(store)) {
    played[pid] = { ...played[pid], [cardId]: { playedAt: now, points, ...extra } };
    removed = clearRemoved(removed, pid, cardId);
  }
  return { ...store, played, removed };
}

export function setPlayedManual(store: Store, profileId: string, cardId: string, isPlayed: boolean, now: number): Store {
  const current = { ...store.played[profileId] };
  if (isPlayed) {
    if (current[cardId]) return store;
    current[cardId] = { playedAt: now, points: null };
    return { ...store, played: { ...store.played, [profileId]: current }, removed: clearRemoved(store.removed, profileId, cardId) };
  }
  if (!current[cardId]) return store;
  delete current[cardId];
  return {
    ...store,
    played: { ...store.played, [profileId]: current },
    removed: { ...store.removed, [profileId]: { ...store.removed[profileId], [cardId]: now } },
  };
}

/** Clears played status for a profile; limited to `cardIds` when given. */
export function resetPlayed(store: Store, profileId: string, cardIds?: string[], now = Date.now()): Store {
  const current = store.played[profileId] ?? {};
  const targets = cardIds ? cardIds.filter((id) => current[id]) : Object.keys(current);
  const next: Record<string, PlayedRecord> = { ...current };
  const removedForProfile = { ...store.removed[profileId] };
  for (const id of targets) {
    delete next[id];
    removedForProfile[id] = now;
  }
  return {
    ...store,
    played: { ...store.played, [profileId]: next },
    removed: { ...store.removed, [profileId]: removedForProfile },
  };
}

export function isPlayed(store: Store, profileId: string, cardId: string): boolean {
  return Boolean(store.played[profileId]?.[cardId]);
}
