import { useState } from 'react';
import type { ClockState, Timetable } from '../../types';
import { elapsedMs, hasStarted } from '../../lib/clock';
import { effectiveMs, formatClock, MINUTE, tierFor, tierSegments } from '../../lib/scoring';
import { Button, ConfirmDialog, SectionLabel } from '../ui';
import { IconPause, IconPlay, IconReset } from '../Icons';

const SEG_COLOR = { masterDetective: 'bg-[#2f7d4a]', privateEye: 'bg-[#c08a1a]', flatfoot: 'bg-[#b5482a]' } as const;

export function ClockPanel({
  clock, timetable, now, onStart, onPause, onReset,
}: {
  clock: ClockState;
  timetable: Timetable;
  now: number;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const started = hasStarted(clock);
  const elapsed = elapsedMs(clock, now);
  const eff = effectiveMs(elapsed, clock.penaltyMin);
  const tier = tierFor(timetable, eff);
  const segs = tierSegments(timetable);
  const total = segs[2]!.end;
  const pos = Math.min(1, eff / (total * MINUTE));

  return (
    <section aria-labelledby="clock-h" className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <SectionLabel>
          <span id="clock-h">Game clock</span>
        </SectionLabel>
        {clock.running && <span className="text-xs font-semibold uppercase tracking-wider text-ok">● Running</span>}
        {!clock.running && started && <span className="text-xs font-semibold uppercase tracking-wider text-muted">Paused</span>}
      </div>

      <div className="mt-2 flex items-baseline gap-3">
        <span className="font-sans text-[56px] font-bold leading-none tabular-nums tracking-tight" role="timer" aria-live="off" aria-label={`Elapsed ${formatClock(elapsed)}`}>
          {formatClock(elapsed)}
        </span>
        {clock.penaltyMin > 0 && (
          <span className="rounded-full bg-mystery px-2.5 py-1 text-sm font-bold text-title">+{clock.penaltyMin} min</span>
        )}
      </div>

      <p className="mt-1 text-[17px] font-semibold" aria-live="polite">
        {started ? (
          <>
            {tier.label} · {tier.points} pts
          </>
        ) : (
          <span className="font-normal text-muted">Start the clock once the case has been read aloud.</span>
        )}
      </p>

      <div className="relative mt-3" aria-hidden>
        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
          {segs.map((s) => (
            <div key={s.key} className={`${SEG_COLOR[s.key as keyof typeof SEG_COLOR]} ${started ? '' : 'opacity-40'}`} style={{ flex: s.end - s.start }} />
          ))}
        </div>
        {started && (
          <div className="absolute -top-1 h-4 w-1 -translate-x-1/2 rounded-full bg-ink shadow" style={{ left: `${pos * 100}%` }} />
        )}
        <div className="mt-1 flex text-[11px] text-muted">
          {segs.map((s) => (
            <span key={s.key} style={{ flex: s.end - s.start }} className="truncate">
              {s.key === 'masterDetective' ? '6' : s.key === 'privateEye' ? '5' : '4'} · ≤{s.end}m
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        {clock.running ? (
          <Button className="flex-1" onClick={onPause}><IconPause width={18} height={18} /> Pause</Button>
        ) : (
          <Button variant="primary" className="flex-1" onClick={onStart}>
            <IconPlay width={18} height={18} /> {started ? 'Resume' : 'Start'}
          </Button>
        )}
        {started && (
          <Button onClick={() => setConfirmReset(true)} aria-label="Reset clock"><IconReset width={18} height={18} /> Reset</Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset the clock?"
        body="The elapsed time goes back to 00:00. Revealed clues stay revealed."
        confirmLabel="Reset"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => { setConfirmReset(false); onReset(); }}
      />
    </section>
  );
}
