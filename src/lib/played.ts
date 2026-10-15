import { ME, type PlayedRecord, type Points, type Store } from '../types';

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
  for (const pid of finishTargets(store)) {
    played[pid] = { ...played[pid], [cardId]: { playedAt: now, points, ...extra } };
  }
  return { ...store, played };
}

export function setPlayedManual(store: Store, profileId: string, cardId: string, isPlayed: boolean, now: number): Store {
  const current = { ...store.played[profileId] };
  if (isPlayed) {
    if (current[cardId]) return store;
    current[cardId] = { playedAt: now, points: null };
  } else {
    delete current[cardId];
  }
  return { ...store, played: { ...store.played, [profileId]: current } };
}

/** Clears played status for a profile; limited to `cardIds` when given. */
export function resetPlayed(store: Store, profileId: string, cardIds?: string[]): Store {
  let next: Record<string, PlayedRecord> = {};
  if (cardIds) {
    next = { ...store.played[profileId] };
    for (const id of cardIds) delete next[id];
  }
  return { ...store, played: { ...store.played, [profileId]: next } };
}

export function isPlayed(store: Store, profileId: string, cardId: string): boolean {
  return Boolean(store.played[profileId]?.[cardId]);
}
