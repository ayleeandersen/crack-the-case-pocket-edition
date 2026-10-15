import { useRef, useState, type ReactNode } from 'react';
import { ME, type Group, type Settings, type Store } from '../types';
import { addGroup, deleteGroup, newGroup, patchGroup, useStore } from '../state/StoreContext';
import { resetPlayed } from '../lib/played';
import { parseImport } from '../lib/store';
import { useGoBack } from '../lib/hooks';
import { Button, ConfirmDialog, Segmented, SectionLabel, Toggle } from '../components/ui';
import { IconBack, IconPlus } from '../components/Icons';

type Pending =
  | { kind: 'resetGroup'; group: Group }
  | { kind: 'deleteGroup'; group: Group }
  | { kind: 'resetMe' }
  | { kind: 'import'; data: Store };

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <SectionLabel>{title}</SectionLabel>
      <div className="rounded-2xl border border-line bg-surface p-4">{children}</div>
    </section>
  );
}

export function GroupsScreen() {
  const { store, update, replace, persistent } = useStore();
  const goBack = useGoBack();
  const [pending, setPending] = useState<Pending | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [newName, setNewName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const setSetting = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    update((s) => ({ ...s, settings: { ...s.settings, [k]: v } }));
  const count = (pid: string) => Object.keys(store.played[pid] ?? {}).length;

  const exportProgress = () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crack-the-case-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setPending({ kind: 'import', data: parseImport(await file.text()) });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not read that file.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const saveRename = (g: Group) => {
    const n = draft.trim();
    if (n) update((s) => patchGroup(s, g.id, { name: n }));
    setEditing(null);
  };

  return (
    <div className="min-h-dvh pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <header className="pt-safe sticky top-0 z-30 bg-band text-band-ink shadow-md">
        <div className="mx-auto flex h-14 max-w-[640px] items-center gap-2 px-2">
          <button type="button" onClick={goBack} className="grid size-11 place-items-center rounded-full active:bg-white/10" aria-label="Back">
            <IconBack />
          </button>
          <h1 className="font-serif text-lg font-bold">Groups &amp; settings</h1>
        </div>
      </header>

      <main className="mx-auto max-w-[640px] space-y-7 px-4 pt-5">
        {message && (
          <p role="alert" className="rounded-xl border border-callout-line bg-callout p-3">{message}</p>
        )}

        <Card title="Groups">
          {store.groups.length === 0 && <p className="mb-3 text-muted">No groups yet. Make one for each crowd you play with.</p>}
          <ul className="divide-y divide-line">
            {store.groups.map((g) => (
              <li key={g.id} className="py-3 first:pt-0">
                {editing === g.id ? (
                  <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); saveRename(g); }}>
                    <label className="sr-only" htmlFor={`rename-${g.id}`}>New name for {g.name}</label>
                    <input
                      id={`rename-${g.id}`}
                      autoFocus
                      value={draft}
                      maxLength={40}
                      onChange={(e) => setDraft(e.target.value)}
                      className="min-h-11 flex-1 rounded-xl border border-line bg-paper px-3 text-[17px]"
                    />
                    <Button type="submit" variant="primary">Save</Button>
                    <Button onClick={() => setEditing(null)}>Cancel</Button>
                  </form>
                ) : (
                  <>
                    <p className="text-[17px] font-bold">{g.name}</p>
                    <p className="text-sm text-muted">{count(g.id)} played</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button className="text-sm" onClick={() => { setDraft(g.name); setEditing(g.id); }}>Rename</Button>
                      <Button className="text-sm" onClick={() => setPending({ kind: 'resetGroup', group: g })}>Reset played history</Button>
                      <Button className="text-sm text-title" onClick={() => setPending({ kind: 'deleteGroup', group: g })}>Delete</Button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
          <form
            className="mt-3 flex gap-2 border-t border-line pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              const n = newName.trim();
              if (!n) return;
              update((s) => addGroup(s, newGroup(n)));
              setNewName('');
            }}
          >
            <label className="sr-only" htmlFor="group-new">New group name</label>
            <input
              id="group-new"
              value={newName}
              maxLength={40}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New group name"
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 text-[17px]"
            />
            <Button type="submit" variant="primary" disabled={!newName.trim()}><IconPlus width={18} height={18} /> New group</Button>
          </form>
        </Card>

        <Card title="Me">
          <p className="text-muted">{count(ME)} cases you already know the answer to.</p>
          <Button className="mt-3 text-title" onClick={() => setPending({ kind: 'resetMe' })}>Reset my played history</Button>
        </Card>

        <Card title="Settings">
          <div className="space-y-4">
            <div>
              <p className="mb-2 font-semibold">Theme</p>
              <Segmented
                label="Theme"
                value={store.settings.theme}
                onChange={(v) => setSetting('theme', v)}
                options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
              />
            </div>
            <div>
              <p className="mb-2 font-semibold">Reading text size</p>
              <Segmented
                label="Text size"
                value={store.settings.textSize}
                onChange={(v) => setSetting('textSize', v)}
                options={[{ value: 'normal', label: 'Normal' }, { value: 'large', label: 'Large' }]}
              />
            </div>
            <Toggle
              label="Confirm before revealing clues"
              description="Asks once per case before adding clue minutes."
              checked={store.settings.confirmClues}
              onChange={(v) => setSetting('confirmClues', v)}
            />
          </div>
        </Card>

        <Card title="Progress">
          <p className="mb-3 text-muted">Move your played history to another phone or browser.</p>
          {!persistent && <p className="mb-3 text-sm">Saving is unavailable in this browser, so export before you close it.</p>}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={exportProgress}>Export my progress</Button>
            <Button onClick={() => fileRef.current?.click()}>Import progress</Button>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
        </Card>

        <Card title="About">
          <h2 className="font-serif text-lg font-bold">How to play</h2>
          <p className="mt-2 leading-relaxed">
            The Moderator reads The Case and The Mystery aloud, then secretly reads The Story. The Investigators ask yes-or-no
            questions to work out what really happened, and can ask for up to two Clues at the cost of extra minutes. The faster
            the group reaches The Solution, the more points it earns.
          </p>
          <p className="mt-4 text-sm text-muted">
            Crack the Case ©1993 Milton Bradley. Official card text is included for personal use only. AI Generated cases are not part of the official game.
          </p>
        </Card>
      </main>

      <ConfirmDialog
        open={pending?.kind === 'resetGroup'}
        title="Reset played history?"
        body={pending?.kind === 'resetGroup' && <>Every case becomes unplayed for <strong>{pending.group.name}</strong>. Your own history isn’t touched.</>}
        confirmLabel="Reset"
        danger
        onCancel={() => setPending(null)}
        onConfirm={() => { if (pending?.kind === 'resetGroup') update((s) => resetPlayed(s, pending.group.id)); setPending(null); }}
      />
      <ConfirmDialog
        open={pending?.kind === 'deleteGroup'}
        title="Delete group?"
        body={pending?.kind === 'deleteGroup' && <><strong>{pending.group.name}</strong> and its played history ({count(pending.group.id)} cases) will be lost. This can’t be undone.</>}
        confirmLabel="Delete"
        danger
        onCancel={() => setPending(null)}
        onConfirm={() => { if (pending?.kind === 'deleteGroup') update((s) => deleteGroup(s, pending.group.id)); setPending(null); }}
      />
      <ConfirmDialog
        open={pending?.kind === 'resetMe'}
        title="Reset your played history?"
        body="Every case will be marked as one you haven’t seen. Group histories stay as they are."
        confirmLabel="Reset"
        danger
        requireText="RESET"
        onCancel={() => setPending(null)}
        onConfirm={() => { update((s) => resetPlayed(s, ME)); setPending(null); }}
      />
      <ConfirmDialog
        open={pending?.kind === 'import'}
        title="Replace progress?"
        body={pending?.kind === 'import' && (
          <>This replaces everything on this device with the imported file: {pending.data.groups.length} group(s), {Object.keys(pending.data.played[ME] ?? {}).length} cases played by you.</>
        )}
        confirmLabel="Replace"
        danger
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending?.kind === 'import') { replace(pending.data); setMessage('Progress imported.'); }
          setPending(null);
        }}
      />
    </div>
  );
}
