import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ME } from '../types';
import { addGroup, newGroup, patchGroup, useStore } from '../state/StoreContext';
import { Button, Sheet, Toggle } from './ui';
import { IconCheck, IconChevronDown, IconPlus, IconSettings, IconUser, IconUsers } from './Icons';

export function ProfileSwitcher() {
  const { store, update, activeGroup, activeName } = useStore();
  const [open, setOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const select = (id: string) => {
    update((s) => ({ ...s, activeProfileId: id }));
    setOpen(false);
  };
  const create = () => {
    const n = name.trim();
    if (!n) return;
    const g = newGroup(n);
    update((s) => ({ ...addGroup(s, g), activeProfileId: g.id }));
    setName('');
    setNaming(false);
    setOpen(false);
  };
  const close = () => { setOpen(false); setNaming(false); };

  const row = (id: string, label: string, icon: React.ReactNode) => {
    const active = store.activeProfileId === id;
    return (
      <li key={id}>
        <button
          type="button"
          onClick={() => select(id)}
          aria-current={active}
          className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[17px] ${active ? 'bg-surface-2 font-bold' : 'active:bg-surface-2'}`}
        >
          <span className="text-muted">{icon}</span>
          <span className="flex-1 truncate">{label}</span>
          {active && <IconCheck className="text-accent dark:text-title" />}
        </button>
      </li>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 min-w-0 max-w-[58%] items-center gap-2 rounded-full border border-band-ink/30 py-1 pl-4 pr-2.5 text-band-ink active:bg-white/10"
        aria-label={`Playing as ${activeName}. Change`}
      >
        <span className="flex min-w-0 flex-col items-start leading-tight">
          <span className="text-[10px] font-semibold uppercase tracking-wider opacity-75">Playing as</span>
          <span className="max-w-full truncate text-[15px] font-bold">{activeName}</span>
        </span>
        <IconChevronDown width={16} height={16} className="shrink-0" />
      </button>

      <Sheet open={open} onClose={close} title="Who’s playing?">
        <ul className="space-y-1">
          {row(ME, 'Just me', <IconUser />)}
          {store.groups.map((g) => row(g.id, g.name, <IconUsers />))}
        </ul>

        {naming ? (
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); create(); }}>
            <label className="sr-only" htmlFor="new-group-name">Group name</label>
            <input
              id="new-group-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Friday Crew"
              maxLength={40}
              className="min-h-11 flex-1 rounded-xl border border-line bg-paper px-3 text-[17px]"
            />
            <Button type="submit" variant="primary" disabled={!name.trim()}>Add</Button>
          </form>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button onClick={() => setNaming(true)}><IconPlus width={18} height={18} /> New group</Button>
            <Button onClick={() => { close(); navigate('/groups'); }}><IconSettings width={18} height={18} /> Manage groups</Button>
          </div>
        )}

        {activeGroup && (
          <div className="mt-5 rounded-2xl border border-line bg-paper px-4 py-2">
            <Toggle
              label="I’m playing too"
              description={`Cases finished with ${activeGroup.name} also count as played for you.`}
              checked={activeGroup.meAlsoPlaying}
              onChange={(v) => update((s) => patchGroup(s, activeGroup.id, { meAlsoPlaying: v }))}
            />
          </div>
        )}
      </Sheet>
    </>
  );
}
