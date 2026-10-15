import type { ClockState } from '../types';

export const CLUE_PENALTY: [number, number] = [1, 2];

export function newClock(cardId: string): ClockState {
  return { cardId, startedAt: null, accumulatedMs: 0, running: false, penaltyMin: 0, cluesRevealed: [false, false] };
}

/** Elapsed time derived from timestamps, so it stays right across sleep and backgrounding. */
export function elapsedMs(c: ClockState, now: number): number {
  const live = c.running && c.startedAt !== null ? Math.max(0, now - c.startedAt) : 0;
  return c.accumulatedMs + live;
}

export function hasStarted(c: ClockState): boolean {
  return c.running || c.accumulatedMs > 0;
}

export function start(c: ClockState, now: number): ClockState {
  if (c.running) return c;
  return { ...c, running: true, startedAt: now };
}

export function pause(c: ClockState, now: number): ClockState {
  if (!c.running) return c;
  return { ...c, running: false, startedAt: null, accumulatedMs: elapsedMs(c, now) };
}

/** Reset clears time only; revealed clues and their penalty stay. */
export function reset(c: ClockState): ClockState {
  return { ...c, running: false, startedAt: null, accumulatedMs: 0 };
}

export function revealClue(c: ClockState, index: 0 | 1): ClockState {
  if (c.cluesRevealed[index]) return c;
  const cluesRevealed: [boolean, boolean] = [...c.cluesRevealed];
  cluesRevealed[index] = true;
  return { ...c, cluesRevealed, penaltyMin: c.penaltyMin + CLUE_PENALTY[index] };
}
