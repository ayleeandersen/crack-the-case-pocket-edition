import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ME, type Card, type ClockState, type Points } from '../types';
import { cardById, cardLabel } from '../data/cards';
import { useStore } from '../state/StoreContext';
import * as clockFns from '../lib/clock';
import { effectiveMs, pointsFor } from '../lib/scoring';
import { isPlayed, markFinished, setPlayedManual } from '../lib/played';
import { useGoBack, useNextCase, useNow, useWakeLock } from '../lib/hooks';
import { Button, DifficultyBadge, Paragraphs, SectionLabel, Toggle } from '../components/ui';
import { IconBack } from '../components/Icons';
import { ClockPanel } from '../components/case/ClockPanel';
import { CluesPanel } from '../components/case/CluesPanel';
import { ModeratorSection } from '../components/case/ModeratorSection';
import { ManualTierSheet, ResultSheet, type Outcome } from '../components/case/FinishSheets';

export function CaseScreen() {
  const { id = '' } = useParams();
  const card = cardById.get(id);
  const navigate = useNavigate();
  if (!card) {
    return (
      <div className="mx-auto max-w-[640px] p-6 text-center">
        <p className="mb-4 text-lg">That case doesn’t exist.</p>
        <Button variant="primary" onClick={() => navigate('/play', { replace: true })}>Go to Play</Button>
      </div>
    );
  }
  // Keyed so every visit starts fresh (moderator section hidden, no outcome).
  return <CaseView key={card.id} card={card} />;
}

function CaseView({ card }: { card: Card }) {
  const { store, update, activeGroup, lastShownRef } = useStore();
  const goBack = useGoBack();
  const nextCase = useNextCase();
  const navigate = useNavigate();
  const modRef = useRef<HTMLElement>(null);

  const [modOpen, setModOpen] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  // The persisted clock belongs to this card only if its id matches; otherwise show a fresh one.
  const clock: ClockState = store.activeClock?.cardId === card.id ? store.activeClock : clockFns.newClock(card.id);
  const now = useNow(clock.running);
  useWakeLock(clock.running && !outcome);

  useEffect(() => {
    lastShownRef.current = card.id;
    const prev = document.title;
    document.title = `${card.title} · Crack the Case`;
    window.scrollTo(0, 0);
    return () => { document.title = prev; };
  }, [card.id, card.title, lastShownRef]);

  const setClock = (fn: (c: ClockState) => ClockState) =>
    update((s) => {
      const current = s.activeClock?.cardId === card.id ? s.activeClock : clockFns.newClock(card.id);
      return { ...s, activeClock: fn(current) };
    });
  const clearClock = () => update((s) => (s.activeClock?.cardId === card.id ? { ...s, activeClock: undefined } : s));

  const cluesUsed = clock.cluesRevealed.filter(Boolean).length;

  const finish = (kind: Outcome['kind'], points: Points, effMs: number | null) => {
    const t = Date.now();
    update((s) => {
      const next = markFinished(s, card.id, points, t, {
        ...(effMs !== null ? { effectiveSec: Math.round(effMs / 1000) } : {}),
        cluesUsed,
      });
      return next.activeClock?.cardId === card.id ? { ...next, activeClock: undefined } : next;
    });
    setOutcome({ kind, points, effectiveMs: effMs, cluesUsed });
  };

  const onSolved = () => {
    if (!clockFns.hasStarted(clock)) {
      setManualOpen(true);
      return;
    }
    const eff = effectiveMs(clockFns.elapsedMs(clock, Date.now()), clock.penaltyMin);
    finish('solved', pointsFor(card.timetable, eff), eff);
    setResultOpen(true);
  };

  const onGaveUp = () => {
    const eff = clockFns.hasStarted(clock) ? effectiveMs(clockFns.elapsedMs(clock, Date.now()), clock.penaltyMin) : null;
    finish('gaveup', 0, eff);
    setModOpen(true);
    requestAnimationFrame(() => modRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const onSkip = () => {
    clearClock();
    navigate('/play');
  };

  const meId = ME;
  const profiles = [{ id: meId, name: 'Me' }, ...(activeGroup ? [{ id: activeGroup.id, name: activeGroup.name }] : [])];

  return (
    <div className="min-h-dvh pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <header className="pt-safe sticky top-0 z-30 bg-band text-band-ink shadow-md">
        <div className="mx-auto flex h-14 max-w-[640px] items-center gap-2 px-2">
          <button type="button" onClick={goBack} className="grid size-11 place-items-center rounded-full active:bg-white/10" aria-label="Back">
            <IconBack />
          </button>
          <span className="flex-1 truncate font-semibold">{cardLabel(card)}</span>
          <span className="pr-2"><DifficultyBadge difficulty={card.difficulty} /></span>
        </div>
      </header>

      <main className="mx-auto max-w-[640px] space-y-6 px-4 pt-5">
        <h1 className="font-serif text-[30px] font-bold leading-tight text-title">{card.title}</h1>

        <section aria-labelledby="case-h">
          <SectionLabel className="mb-2"><span id="case-h">The Case</span></SectionLabel>
          <div className="reading"><Paragraphs items={card.case} /></div>
        </section>

        <section aria-labelledby="mystery-h" className="rounded-2xl border-l-4 border-mystery-line bg-mystery p-4">
          <SectionLabel className="mb-1"><span id="mystery-h">The Mystery</span></SectionLabel>
          <p className="reading font-bold italic">{card.mystery}</p>
        </section>

        {outcome ? (
          <div role="status" className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-lg font-bold">
              {outcome.kind === 'solved' ? `Solved · ${outcome.points} pts` : 'Gave up · 0 pts'}
            </p>
            <p className="text-muted">
              Marked played for {profiles.filter((p) => isPlayed(store, p.id, card.id)).map((p) => p.name).join(' and ') || 'nobody'}.
            </p>
          </div>
        ) : (
          <>
            <ClockPanel
              clock={clock}
              timetable={card.timetable}
              now={now}
              onStart={() => setClock((c) => clockFns.start(c, Date.now()))}
              onPause={() => setClock((c) => clockFns.pause(c, Date.now()))}
              onReset={() => setClock(clockFns.reset)}
            />
            <CluesPanel clues={card.clues} revealed={clock.cluesRevealed} onReveal={(i) => setClock((c) => clockFns.revealClue(c, i))} />
          </>
        )}

        <ModeratorSection ref={modRef} card={card} open={modOpen} onOpen={() => setModOpen(true)} onHide={() => setModOpen(false)} />

        <section aria-labelledby="status-h" className="border-t border-line pt-4 pb-2">
          <SectionLabel className="mb-1"><span id="status-h">Played status</span></SectionLabel>
          {profiles.map((p) => {
            const played = isPlayed(store, p.id, card.id);
            return (
              <Toggle
                key={p.id}
                label={p.id === ME ? `I have ${played ? '' : 'not '}played this one` : `${p.name} ${played ? 'has' : 'has not'} played this one`}
                checked={played}
                onChange={(v) => update((s) => setPlayedManual(s, p.id, card.id, v, Date.now()))}
              />
            );
          })}
        </section>
      </main>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[640px] gap-2 px-3 py-3">
          {outcome ? (
            <>
              <Button className="flex-1" onClick={goBack}>Back</Button>
              <Button variant="primary" className="flex-[2]" onClick={() => nextCase({ replace: true })}>Next Case</Button>
            </>
          ) : (
            <>
              <Button variant="primary" className="min-h-13 flex-[2] text-[17px]" onClick={onSolved}>Solved!</Button>
              <Button className="min-h-13 flex-1" onClick={onGaveUp}>Gave up</Button>
              <Button variant="ghost" className="min-h-13 flex-1 text-muted" onClick={onSkip}>Skip</Button>
            </>
          )}
        </div>
      </div>

      <ManualTierSheet
        open={manualOpen}
        timetable={card.timetable}
        onClose={() => setManualOpen(false)}
        onPick={(p) => { setManualOpen(false); finish('solved', p, null); setResultOpen(true); }}
      />
      <ResultSheet
        outcome={outcome}
        open={resultOpen}
        onClose={() => setResultOpen(false)}
        onBack={() => { setResultOpen(false); goBack(); }}
        onNext={() => { setResultOpen(false); nextCase({ replace: true }); }}
      />
    </div>
  );
}
