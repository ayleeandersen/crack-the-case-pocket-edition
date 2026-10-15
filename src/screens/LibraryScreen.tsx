import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DIFFICULTIES, ME, type Card, type LibraryPrefs, type Store } from '../types';
import { cards, cardLabel, compareByNumber } from '../data/cards';
import { useStore } from '../state/StoreContext';
import { matchesFilters } from '../lib/selection';
import { isPlayed, setPlayedManual } from '../lib/played';
import { DifficultyDot, Segmented, Sheet, Toggle } from '../components/ui';
import { FilterChips } from '../components/FilterChips';
import { IconCheck, IconMore, IconSearch } from '../components/Icons';

function progressLine(store: Store, profileId: string, name: string): string {
  const played = store.played[profileId] ?? {};
  const parts = DIFFICULTIES.map((d) => {
    const all = cards.filter((c) => c.difficulty === d);
    return `${d} ${all.filter((c) => c.id in played).length}/${all.length}`;
  });
  const total = cards.filter((c) => c.id in played).length;
  return `${name} · ${total} of ${cards.length} played · ${parts.join(' · ')}`;
}

export function LibraryScreen() {
  const { store, update, activeGroup, activeName } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [menuCard, setMenuCard] = useState<Card | null>(null);
  const prefs = store.libraryPrefs;
  const profileId = store.activeProfileId;
  const setPrefs = (p: Partial<LibraryPrefs>) => update((s) => ({ ...s, libraryPrefs: { ...s.libraryPrefs, ...p } }));

  const list = useMemo(() => {
    const played = store.played[profileId] ?? {};
    const q = query.trim().toLowerCase();
    const out = cards.filter((c) => {
      if (!matchesFilters(c, prefs)) return false;
      if (prefs.status === 'played' && !(c.id in played)) return false;
      if (prefs.status === 'unplayed' && c.id in played) return false;
      return !q || c.title.toLowerCase().includes(q);
    });
    if (prefs.sort === 'title') out.sort((a, b) => a.title.localeCompare(b.title));
    else if (prefs.sort === 'recent') {
      const at = (c: Card) => played[c.id]?.playedAt ?? -1;
      out.sort((a, b) => at(b) - at(a) || compareByNumber(a, b));
    } else out.sort(compareByNumber);
    return out;
  }, [store.played, profileId, prefs, query]);

  return (
    <div className="px-4 pt-4">
      <section aria-label="Progress" className="rounded-2xl border border-line bg-surface px-4 py-3 text-[14px] leading-snug">
        <p className="font-semibold">{progressLine(store, profileId, activeName)}</p>
        {activeGroup && <p className="mt-1 text-muted">{progressLine(store, ME, 'Me')}</p>}
      </section>

      <div className="mt-4 space-y-3">
        <label className="relative block">
          <span className="sr-only">Search titles</span>
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles"
            className="min-h-12 w-full rounded-xl border border-line bg-surface pl-11 pr-3 text-[17px] placeholder:text-muted"
          />
        </label>
        <Segmented
          label="Played status"
          value={prefs.status}
          onChange={(status) => setPrefs({ status })}
          options={[{ value: 'all', label: 'All' }, { value: 'unplayed', label: 'Not played' }, { value: 'played', label: 'Played' }]}
        />
        <FilterChips value={prefs} onChange={(f) => setPrefs(f)} />
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted" aria-live="polite">{list.length} {list.length === 1 ? 'case' : 'cases'}</p>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">Sort</span>
            <select
              value={prefs.sort}
              onChange={(e) => setPrefs({ sort: e.target.value as LibraryPrefs['sort'] })}
              className="min-h-11 rounded-xl border border-line bg-surface px-3 font-semibold"
            >
              <option value="number">Card number</option>
              <option value="title">Title A–Z</option>
              <option value="recent">Recently played</option>
            </select>
          </label>
        </div>
      </div>

      <ul className="mt-3 mb-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {list.map((c) => (
          <LibraryRow
            key={c.id}
            card={c}
            meplayed={isPlayed(store, ME, c.id)}
            groupName={activeGroup?.name}
            groupPlayed={activeGroup ? isPlayed(store, activeGroup.id, c.id) : false}
            onOpen={() => navigate(`/case/${c.id}`)}
            onMenu={() => setMenuCard(c)}
          />
        ))}
        {list.length === 0 && <li className="p-6 text-center text-muted">No cases match.</li>}
      </ul>

      <Sheet open={menuCard !== null} onClose={() => setMenuCard(null)} title={menuCard ? `${cardLabel(menuCard)} · ${menuCard.title}` : ''}>
        {menuCard && (
          <div className="divide-y divide-line">
            {[{ id: ME, name: 'Me' }, ...(activeGroup ? [{ id: activeGroup.id, name: activeGroup.name }] : [])].map((p) => (
              <Toggle
                key={p.id}
                label={`Played by ${p.name}`}
                checked={isPlayed(store, p.id, menuCard.id)}
                onChange={(v) => update((s) => setPlayedManual(s, p.id, menuCard.id, v, Date.now()))}
              />
            ))}
          </div>
        )}
      </Sheet>
    </div>
  );
}

function LibraryRow({ card, meplayed, groupName, groupPlayed, onOpen, onMenu }: {
  card: Card;
  meplayed: boolean;
  groupName?: string;
  groupPlayed: boolean;
  onOpen: () => void;
  onMenu: () => void;
}) {
  const timer = useRef<number | undefined>(undefined);
  const longPressed = useRef(false);
  const activePlayed = groupName ? groupPlayed : meplayed;
  const cancel = () => window.clearTimeout(timer.current);

  return (
    <li className="row-cv flex items-stretch">
      <button
        type="button"
        onClick={() => { if (!longPressed.current) onOpen(); }}
        onPointerDown={() => {
          longPressed.current = false;
          timer.current = window.setTimeout(() => { longPressed.current = true; navigator.vibrate?.(10); onMenu(); }, 500);
        }}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        className="flex min-h-16 min-w-0 flex-1 select-none items-center gap-3 py-2 pl-4 text-left active:bg-surface-2 [-webkit-touch-callout:none]"
      >
        <DifficultyDot difficulty={card.difficulty} />
        <span className="sr-only">{card.difficulty}.</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-serif text-[17px] font-bold">{card.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <span>{cardLabel(card)}</span>
            {meplayed && <span className="font-semibold text-ok">✓ You</span>}
            {groupName && groupPlayed && <span className="font-semibold text-ok">✓ {groupName}</span>}
          </span>
        </span>
        {activePlayed ? (
          <span className="grid size-6 place-items-center rounded-full bg-ok text-surface" aria-hidden><IconCheck width={14} height={14} strokeWidth={3} /></span>
        ) : (
          <span className="size-6 rounded-full border-2 border-muted/60" aria-hidden />
        )}
        <span className="sr-only">{activePlayed ? 'Played' : 'Not played'}{groupName ? ` by ${groupName}` : ''}.</span>
      </button>
      <button type="button" onClick={onMenu} aria-label={`Played options for ${card.title}`} className="grid w-12 shrink-0 place-items-center text-muted active:bg-surface-2">
        <IconMore />
      </button>
    </li>
  );
}
