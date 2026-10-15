import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cardById, cards, cardLabel } from '../data/cards';
import { useStore, patchGroup } from '../state/StoreContext';
import { matchesFilters, unplayedMatching } from '../lib/selection';
import { resetPlayed } from '../lib/played';
import { useNextCase } from '../lib/hooks';
import { Button, ConfirmDialog, DifficultyDot, SectionLabel } from '../components/ui';
import { FilterChips } from '../components/FilterChips';
import { IconCheck, IconDice } from '../components/Icons';

export function PlayScreen() {
  const { store, update, activeGroup, activeName, activeFilters } = useStore();
  const nextCase = useNextCase();
  const [confirmReset, setConfirmReset] = useState(false);
  const profileId = store.activeProfileId;
  const played = store.played[profileId] ?? {};

  const poolCount = useMemo(() => unplayedMatching(cards, activeFilters, played).length, [activeFilters, played]);
  const matchingIds = useMemo(() => cards.filter((c) => matchesFilters(c, activeFilters)).map((c) => c.id), [activeFilters]);

  const recent = useMemo(
    () =>
      Object.entries(played)
        .filter(([, r]) => r.points !== null)
        .sort(([, a], [, b]) => b.playedAt - a.playedAt)
        .slice(0, 3)
        .flatMap(([id, r]) => {
          const card = cardById.get(id);
          return card ? [{ card, points: r.points }] : [];
        }),
    [played],
  );

  return (
    <div className="flex flex-1 flex-col px-4 pt-5">
      <section aria-labelledby="filters-h" className="space-y-3">
        <SectionLabel><span id="filters-h">Choose your cases</span></SectionLabel>
        <FilterChips
          value={activeFilters}
          onChange={(f) => update((s) => ({ ...s, filters: { ...s.filters, [profileId]: f } }))}
        />
      </section>

      {activeGroup && (
        <button
          type="button"
          aria-pressed={activeGroup.meAlsoPlaying}
          onClick={() => update((s) => patchGroup(s, activeGroup.id, { meAlsoPlaying: !activeGroup.meAlsoPlaying }))}
          className={`mt-4 inline-flex min-h-11 items-center gap-2 self-start rounded-full border px-4 text-sm font-semibold ${
            activeGroup.meAlsoPlaying ? 'border-ok/40 bg-surface text-ok' : 'border-line bg-surface text-muted'
          }`}
        >
          <span aria-hidden className={`grid size-5 place-items-center rounded-full ${activeGroup.meAlsoPlaying ? 'bg-ok text-surface' : 'border border-line'}`}>
            {activeGroup.meAlsoPlaying && <IconCheck width={14} height={14} strokeWidth={3} />}
          </span>
          I’m playing too
        </button>
      )}

      <p className="mt-5 font-serif text-[19px] leading-snug" aria-live="polite">
        <strong className="text-title">{poolCount}</strong> unplayed {poolCount === 1 ? 'case matches' : 'cases match'} your filters
        {activeGroup ? <> for <strong>{activeName}</strong></> : null}.
      </p>

      <div className="flex-1" />

      <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-10 -mx-4 mt-6 bg-gradient-to-t from-paper via-paper to-transparent px-4 pb-3 pt-6">
        {poolCount > 0 ? (
          <Button variant="primary" className="min-h-16 w-full rounded-2xl text-[20px]" onClick={() => nextCase()}>
            <IconDice /> Next Case
          </Button>
        ) : (
          <div className="rounded-2xl border border-line bg-surface p-5 text-center">
            <p className="font-serif text-2xl font-bold text-title">All caught up!</p>
            <p className="mt-1 text-muted">{activeName} has played every case that matches these filters.</p>
            <div className="mt-4 grid gap-2">
              <Button variant="primary" className="min-h-13" onClick={() => nextCase({ includePlayed: true })}>Include played cases</Button>
              <Button onClick={() => setConfirmReset(true)}>Reset played history for these filters</Button>
            </div>
          </div>
        )}
      </div>

      {recent.length > 0 && (
        <section aria-labelledby="recent-h" className="mb-4">
          <SectionLabel className="mb-2"><span id="recent-h">Recently finished</span></SectionLabel>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {recent.map(({ card, points }) => (
              <li key={card.id}>
                <Link to={`/case/${card.id}`} className="flex min-h-12 items-center gap-3 px-4 py-2 active:bg-surface-2">
                  <DifficultyDot difficulty={card.difficulty} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{card.title}</span>
                    <span className="block text-xs text-muted">{cardLabel(card)}</span>
                  </span>
                  <span className="font-serif text-lg font-bold text-title">{points}<span className="sr-only"> points</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={confirmReset}
        title="Reset played history?"
        body={<>This marks the <strong>{matchingIds.length}</strong> cases matching these filters as unplayed for <strong>{activeName}</strong>. Other profiles aren’t affected.</>}
        confirmLabel="Reset"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => { update((s) => resetPlayed(s, profileId, matchingIds)); setConfirmReset(false); }}
      />
    </div>
  );
}
