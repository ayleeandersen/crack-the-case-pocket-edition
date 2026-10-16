import { useState } from 'react';
import { CLUE_PENALTY } from '../../lib/clock';
import { useStore } from '../../state/StoreContext';
import { ConfirmDialog, SectionLabel } from '../ui';
import { IconBulb } from '../Icons';

export function CluesPanel({ clues, revealed, onReveal, disabled }: {
  clues: [string, string];
  revealed: [boolean, boolean];
  onReveal: (i: 0 | 1) => void;
  disabled?: boolean;
}) {
  const { store, update } = useStore();
  const [askedThisCase, setAskedThisCase] = useState(false);
  const [pending, setPending] = useState<0 | 1 | null>(null);
  const [dontAsk, setDontAsk] = useState(false);

  const request = (i: 0 | 1) => {
    if (store.settings.confirmClues && !askedThisCase) {
      setDontAsk(false);
      setPending(i);
    } else onReveal(i);
  };
  const confirm = () => {
    if (pending === null) return;
    if (dontAsk) update((s) => ({ ...s, settings: { ...s.settings, confirmClues: false } }));
    setAskedThisCase(true);
    onReveal(pending);
    setPending(null);
  };

  return (
    <section aria-labelledby="clues-h" className="space-y-3">
      <SectionLabel><span id="clues-h">Clues</span></SectionLabel>
      {([0, 1] as const).map((i) =>
        revealed[i] ? (
          <div key={i} className="rounded-2xl border border-line bg-surface p-4">
            <div className="mb-1 flex items-center justify-between text-sm font-bold text-muted">
              <span>Clue {i + 1}</span>
              <span>+{CLUE_PENALTY[i]} min</span>
            </div>
            <p className="reading">{clues[i]}</p>
          </div>
        ) : (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => request(i)}
            className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-dashed border-line bg-surface px-4 text-left text-[16px] font-semibold active:bg-surface-2 disabled:opacity-50"
          >
            <IconBulb className="text-muted" />
            Reveal Clue {i + 1} <span className="font-normal text-muted">(+{CLUE_PENALTY[i]} min)</span>
          </button>
        ),
      )}
      <ConfirmDialog
        open={pending !== null}
        title={pending === null ? '' : `Reveal Clue ${pending + 1}?`}
        body={pending === null ? '' : `This adds ${CLUE_PENALTY[pending]} minute${CLUE_PENALTY[pending] > 1 ? 's' : ''} to the clock.`}
        confirmLabel="Reveal"
        onCancel={() => setPending(null)}
        onConfirm={confirm}
        extra={
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" checked={dontAsk} onChange={(e) => setDontAsk(e.target.checked)} className="size-5 accent-[var(--accent)]" />
            Don’t ask again
          </label>
        }
      />
    </section>
  );
}
