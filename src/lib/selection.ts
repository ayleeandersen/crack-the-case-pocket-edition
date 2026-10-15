import type { Card, Filters } from '../types';

export function matchesFilters(card: Card, f: Filters): boolean {
  return f.difficulties.includes(card.difficulty) && f.decks.includes(card.source);
}

export function unplayedMatching(cards: Card[], f: Filters, played: Record<string, unknown>): Card[] {
  return cards.filter((c) => matchesFilters(c, f) && !(c.id in played));
}

export interface PickOptions {
  /** The card just shown or skipped; avoided unless it is the only one left. */
  excludeId?: string | null;
  includePlayed?: boolean;
  rng?: () => number;
}

export function pickRandomCard(
  cards: Card[],
  filters: Filters,
  played: Record<string, unknown>,
  { excludeId = null, includePlayed = false, rng = Math.random }: PickOptions = {},
): Card | null {
  let pool = includePlayed ? cards.filter((c) => matchesFilters(c, filters)) : unplayedMatching(cards, filters, played);
  if (pool.length === 0) return null;
  if (pool.length > 1 && excludeId) pool = pool.filter((c) => c.id !== excludeId);
  return pool[Math.floor(rng() * pool.length)] ?? pool[0]!;
}
