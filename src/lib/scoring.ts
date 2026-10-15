import type { Points, Timetable } from '../types';

export const MINUTE = 60_000;

export interface Tier {
  key: 'masterDetective' | 'privateEye' | 'flatfoot' | 'out';
  label: string;
  points: Points;
}

export const TIERS: Record<Tier['key'], Tier> = {
  masterDetective: { key: 'masterDetective', label: 'Master Detective', points: 6 },
  privateEye: { key: 'privateEye', label: 'Private Eye', points: 5 },
  flatfoot: { key: 'flatfoot', label: 'Flatfoot', points: 4 },
  out: { key: 'out', label: 'Out of time', points: 0 },
};

/** Whole minutes for scoring: always rounded up, minimum 1. */
export function scoringMinute(effectiveMs: number): number {
  return Math.max(1, Math.ceil(effectiveMs / MINUTE));
}

export function effectiveMs(elapsedMs: number, penaltyMin: number): number {
  return elapsedMs + penaltyMin * MINUTE;
}

const within = (m: number, [lo, hi]: [number, number]) => m >= lo && m <= hi;

/** Tiers are checked in order, so overlapping ranges resolve to the higher tier. */
export function tierFor(timetable: Timetable, effMs: number): Tier {
  const m = scoringMinute(effMs);
  if (within(m, timetable.masterDetective)) return TIERS.masterDetective;
  if (within(m, timetable.privateEye)) return TIERS.privateEye;
  if (within(m, timetable.flatfoot)) return TIERS.flatfoot;
  return TIERS.out;
}

export function pointsFor(timetable: Timetable, effMs: number): Points {
  return tierFor(timetable, effMs).points;
}

/** Contiguous [start, end] minute segments for the progress bar (tolerates overlapping data). */
export function tierSegments(t: Timetable): { key: Tier['key']; start: number; end: number }[] {
  const md = { key: 'masterDetective' as const, start: 0, end: t.masterDetective[1] };
  const pe = { key: 'privateEye' as const, start: md.end, end: Math.max(md.end, t.privateEye[1]) };
  const ff = { key: 'flatfoot' as const, start: pe.end, end: Math.max(pe.end, t.flatfoot[1]) };
  return [md, pe, ff];
}

export function formatClock(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
