import type { Points, Timetable } from '../../types';
import { formatClock, TIERS } from '../../lib/scoring';
import { Button, Sheet } from '../ui';

export interface Outcome {
  kind: 'solved' | 'gaveup';
  points: Points;
  effectiveMs: number | null;
  cluesUsed: number;
}

export function ResultSheet({ outcome, open, onClose, onNext, onBack }: {
  outcome: Outcome | null;
  open: boolean;
  onClose: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  if (!outcome) return null;
  const tier = Object.values(TIERS).find((t) => t.points === outcome.points)!;
  return (
    <Sheet open={open} onClose={onClose} title="Case solved!">
      <div className="text-center">
        <p className="font-serif text-[64px] font-bold leading-none text-title">{outcome.points}</p>
        <p className="mt-1 text-lg font-semibold">points · {tier.label}</p>
        <dl className="mx-auto mt-5 grid max-w-xs grid-cols-2 gap-3 text-left">
          <div className="rounded-xl bg-paper p-3">
            <dt className="text-xs font-bold uppercase tracking-wider text-muted">Effective time</dt>
            <dd className="text-xl font-bold tabular-nums">{outcome.effectiveMs === null ? '—' : formatClock(outcome.effectiveMs)}</dd>
          </div>
          <div className="rounded-xl bg-paper p-3">
            <dt className="text-xs font-bold uppercase tracking-wider text-muted">Clues used</dt>
            <dd className="text-xl font-bold">{outcome.cluesUsed} of 2</dd>
          </div>
        </dl>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button onClick={onBack}>Back</Button>
          <Button variant="primary" onClick={onNext}>Next Case</Button>
        </div>
      </div>
    </Sheet>
  );
}

export function ManualTierSheet({ open, timetable, onPick, onClose }: {
  open: boolean;
  timetable: Timetable;
  onPick: (p: Points) => void;
  onClose: () => void;
}) {
  const options: { points: Points; label: string; range: string }[] = [
    { points: 6, label: TIERS.masterDetective.label, range: `${timetable.masterDetective[0]}–${timetable.masterDetective[1]} min` },
    { points: 5, label: TIERS.privateEye.label, range: `${timetable.privateEye[0]}–${timetable.privateEye[1]} min` },
    { points: 4, label: TIERS.flatfoot.label, range: `${timetable.flatfoot[0]}–${timetable.flatfoot[1]} min` },
    { points: 0, label: TIERS.out.label, range: `over ${timetable.flatfoot[1]} min` },
  ];
  return (
    <Sheet open={open} onClose={onClose} title="How long did it take?">
      <p className="mb-4 text-muted">The clock wasn’t started, so pick the tier yourself.</p>
      <div className="space-y-2">
        {options.map((o) => (
          <button
            key={o.points}
            type="button"
            onClick={() => onPick(o.points)}
            className="flex min-h-14 w-full items-center gap-4 rounded-2xl border border-line bg-paper px-4 text-left active:bg-surface-2"
          >
            <span className="w-8 text-center font-serif text-2xl font-bold text-title">{o.points}</span>
            <span className="flex-1">
              <span className="block font-semibold">{o.label}</span>
              <span className="block text-sm text-muted">{o.range}</span>
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
