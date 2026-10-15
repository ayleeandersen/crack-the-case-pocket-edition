import { describe, expect, test } from 'vitest';
import type { Card, Filters, Store, Timetable } from '../types';
import { cards as allCards } from '../data/cards';
import { pickRandomCard, unplayedMatching } from './selection';
import { finishTargets, markFinished, resetPlayed, setPlayedManual } from './played';
import { MINUTE, pointsFor, scoringMinute, effectiveMs } from './scoring';
import { elapsedMs, newClock, pause, reset, revealClue, start } from './clock';
import { defaultStore, migrate, parseImport } from './store';

const card = (id: string, difficulty: Card['difficulty'], source: Card['source']): Card => ({
  id, number: 0, source, title: id, difficulty, case: [], mystery: '', clues: ['', ''],
  timetable: { masterDetective: [1, 6], privateEye: [7, 9], flatfoot: [10, 12] },
  story: [], specialInformation: null, solution: '',
});

const deck = [
  card('1', 'Easy', 'official'),
  card('2', 'Medium', 'official'),
  card('3', 'Difficult', 'official'),
  card('O1', 'Easy', 'original'),
  card('O2', 'Medium', 'original'),
];
const all: Filters = { difficulties: ['Easy', 'Medium', 'Difficult'], decks: ['official', 'original'] };
const ms = (m: number, s = 0) => m * MINUTE + s * 1000;

describe('random selection', () => {
  test('respects difficulty and deck filters', () => {
    const f: Filters = { difficulties: ['Medium', 'Difficult'], decks: ['official'] };
    for (let i = 0; i < 50; i++) {
      const c = pickRandomCard(deck, f, {}, { rng: () => i / 50 })!;
      expect(['2', '3']).toContain(c.id);
    }
    expect(unplayedMatching(deck, f, {})).toHaveLength(2);
  });

  test('skips cards played by the active profile', () => {
    const played = { '1': {}, '2': {}, '3': {}, O1: {} };
    for (let i = 0; i < 20; i++) expect(pickRandomCard(deck, all, played, { rng: () => i / 20 })!.id).toBe('O2');
  });

  test('never repeats the last card unless it is the only one', () => {
    for (let i = 0; i < 50; i++) expect(pickRandomCard(deck, all, {}, { excludeId: '2', rng: () => i / 50 })!.id).not.toBe('2');
    const played = { '1': {}, '3': {}, O1: {}, O2: {} };
    expect(pickRandomCard(deck, all, played, { excludeId: '2' })!.id).toBe('2');
  });

  test('returns null when the pool is empty', () => {
    const played = Object.fromEntries(deck.map((c) => [c.id, {}]));
    expect(pickRandomCard(deck, all, played)).toBeNull();
  });

  test('includePlayed draws from all matching cards', () => {
    const played = Object.fromEntries(deck.map((c) => [c.id, {}]));
    expect(pickRandomCard(deck, all, played, { includePlayed: true })).not.toBeNull();
  });

  test('real data: Easy+Originals off leaves 66 official Medium/Difficult cards', () => {
    const f: Filters = { difficulties: ['Medium', 'Difficult'], decks: ['official'] };
    expect(allCards).toHaveLength(208);
    expect(unplayedMatching(allCards, f, {})).toHaveLength(66);
  });
});

describe('played rules', () => {
  const withGroup = (meAlsoPlaying: boolean): Store => ({
    ...defaultStore(),
    activeProfileId: 'g1',
    groups: [{ id: 'g1', name: 'Friday Crew', createdAt: 0, meAlsoPlaying }],
  });

  test('as Me, finishing marks only Me', () => {
    const s = markFinished(defaultStore(), '5', 6, 100);
    expect(s.played.me!['5']).toEqual({ playedAt: 100, points: 6 });
    expect(Object.keys(s.played)).toEqual(['me']);
  });

  test('as a group with "I\'m playing too" on, marks group and Me', () => {
    const s = markFinished(withGroup(true), '5', 5, 100);
    expect(finishTargets(withGroup(true))).toEqual(['g1', 'me']);
    expect(s.played.g1!['5']?.points).toBe(5);
    expect(s.played.me!['5']?.points).toBe(5);
  });

  test('as a group with "I\'m playing too" off, marks only the group', () => {
    const s = markFinished(withGroup(false), '5', 0, 100);
    expect(s.played.g1!['5']?.points).toBe(0);
    expect(s.played.me!['5']).toBeUndefined();
  });

  test('manual toggles set points to null and can unmark', () => {
    let s = setPlayedManual(defaultStore(), 'me', '9', true, 1);
    expect(s.played.me!['9']).toEqual({ playedAt: 1, points: null });
    s = setPlayedManual(s, 'me', '9', false, 2);
    expect(s.played.me!['9']).toBeUndefined();
  });

  test('reset clears only the given cards for the given profile', () => {
    let s = markFinished(withGroup(true), 'a', 6, 1);
    s = markFinished(s, 'b', 6, 1);
    s = resetPlayed(s, 'g1', ['a']);
    expect(Object.keys(s.played.g1!)).toEqual(['b']);
    expect(Object.keys(s.played.me!).sort()).toEqual(['a', 'b']);
  });
});

describe('scoring', () => {
  const t1: Timetable = { masterDetective: [1, 6], privateEye: [7, 9], flatfoot: [10, 12] };
  const t2: Timetable = { masterDetective: [1, 10], privateEye: [11, 15], flatfoot: [16, 20] };
  const t3: Timetable = { masterDetective: [1, 14], privateEye: [15, 21], flatfoot: [22, 28] };

  test('rounds up to whole minutes, minimum 1', () => {
    expect(scoringMinute(0)).toBe(1);
    expect(scoringMinute(1000)).toBe(1);
    expect(scoringMinute(ms(1))).toBe(1);
    expect(scoringMinute(ms(1) + 1)).toBe(2);
  });

  test.each([
    [t1, ms(6), 6], [t1, ms(6, 1), 5], [t1, ms(9), 5], [t1, ms(9, 1), 4], [t1, ms(12), 4], [t1, ms(12, 1), 0],
    [t2, ms(10), 6], [t2, ms(10, 1), 5], [t2, ms(15, 1), 4], [t2, ms(20), 4], [t2, ms(20, 1), 0],
    [t3, ms(14), 6], [t3, ms(14, 1), 5], [t3, ms(21, 1), 4], [t3, ms(28), 4], [t3, ms(45), 0],
  ])('tier boundaries %#', (t, eff, pts) => {
    expect(pointsFor(t, eff)).toBe(pts);
  });

  test('clue penalties: Clue 2 at 5:30 on 1–6/7–9/10–12 gives 5 points', () => {
    expect(pointsFor(t1, effectiveMs(ms(5, 30), 2))).toBe(5);
    expect(pointsFor(t1, effectiveMs(ms(5, 30), 0))).toBe(6);
    expect(pointsFor(t1, effectiveMs(ms(11), 3))).toBe(0);
  });

  test('overlapping data (card 92: flatfoot 16–28) still scores in tier order', () => {
    const t92: Timetable = { masterDetective: [1, 14], privateEye: [15, 21], flatfoot: [16, 28] };
    expect(pointsFor(t92, ms(18))).toBe(5);
    expect(pointsFor(t92, ms(25))).toBe(4);
  });
});

describe('clock', () => {
  test('elapsed time comes from timestamps across pause and resume', () => {
    let c = newClock('1');
    expect(elapsedMs(c, 5000)).toBe(0);
    c = start(c, 1000);
    expect(elapsedMs(c, 61_000)).toBe(60_000);
    c = pause(c, 31_000);
    expect(elapsedMs(c, 999_999)).toBe(30_000);
    c = start(c, 100_000);
    // Screen locked for 2 minutes: no ticks needed.
    expect(elapsedMs(c, 220_000)).toBe(150_000);
    c = pause(c, 220_000);
    expect(c.accumulatedMs).toBe(150_000);
    expect(reset(c).accumulatedMs).toBe(0);
  });

  test('clue penalties are recorded even before the clock starts, once each', () => {
    let c = revealClue(newClock('1'), 1);
    expect(c.penaltyMin).toBe(2);
    c = revealClue(c, 1);
    expect(c.penaltyMin).toBe(2);
    c = revealClue(c, 0);
    expect(c.penaltyMin).toBe(3);
    expect(c.cluesRevealed).toEqual([true, true]);
  });
});

describe('persistence', () => {
  test('round-trips through export/import', () => {
    const s = markFinished({ ...defaultStore(), groups: [{ id: 'g', name: 'Fam', createdAt: 1, meAlsoPlaying: false }], activeProfileId: 'g' }, '7', 4, 9);
    expect(parseImport(JSON.stringify(s))).toEqual(migrate(s));
    expect(parseImport(JSON.stringify(s)).played.g!['7']?.points).toBe(4);
  });

  test('rejects files that are not progress', () => {
    expect(() => parseImport('nope')).toThrow();
    expect(() => parseImport('{"hello":1}')).toThrow();
  });

  test('migration repairs empty filters and unknown active profile', () => {
    const s = migrate({ schemaVersion: 1, activeProfileId: 'ghost', groups: [], played: {}, filters: { me: { difficulties: [], decks: [] } } });
    expect(s.activeProfileId).toBe('me');
    expect(s.filters.me!.difficulties).toHaveLength(3);
  });
});
