import { forwardRef } from 'react';
import type { Card } from '../../types';
import { Paragraphs, SectionLabel } from '../ui';
import { IconEye, IconEyeOff } from '../Icons';

export const ModeratorSection = forwardRef<HTMLElement, { card: Card; open: boolean; onOpen: () => void; onHide: () => void }>(
  function ModeratorSection({ card, open, onOpen, onHide }, ref) {
    return (
      <section ref={ref} aria-label="Moderator: story and solution" className="scroll-mt-[calc(4rem+env(safe-area-inset-top))]">
        {!open ? (
          <button
            type="button"
            onClick={onOpen}
            aria-expanded={false}
            className="flex min-h-13 w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-band bg-surface text-[16px] font-bold text-ink active:bg-surface-2 dark:border-line"
          >
            <IconEye /> Show Story &amp; Solution
          </button>
        ) : (
          <div className="rounded-2xl border-2 border-band bg-surface dark:border-line">
            <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 flex items-center justify-between gap-2 rounded-t-2xl border-b border-line bg-surface px-4 py-2">
              <span className="text-[13px] font-bold uppercase tracking-[0.18em] text-muted">Moderator only</span>
              <button
                type="button"
                onClick={onHide}
                aria-expanded
                className="flex min-h-11 items-center gap-2 rounded-xl bg-pressed px-4 font-semibold text-pressed-ink active:brightness-90"
              >
                <IconEyeOff width={18} height={18} /> Hide
              </button>
            </div>
            <div className="space-y-6 px-4 pb-6 pt-4">
              <div>
                <SectionLabel as="h3" className="mb-2">The Story</SectionLabel>
                <div className="reading"><Paragraphs items={card.story} /></div>
              </div>
              {card.specialInformation !== null && (
                <aside className="rounded-xl border-l-4 border-callout-line bg-callout p-4" aria-label="Special information">
                  <SectionLabel as="h3" className="mb-1">Special Information</SectionLabel>
                  <p className="reading !text-[0.9em]">{card.specialInformation}</p>
                </aside>
              )}
              <div>
                <SectionLabel as="h3" className="mb-2">The Solution</SectionLabel>
                <p className="reading font-bold">{card.solution}</p>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  },
);
