import { useMemo, useState } from 'react';
import type { Store } from '../types';
import { mergeStores } from '../lib/merge';
import { useStore } from '../state/StoreContext';
import { Button, Sheet } from './ui';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function ImportSheet({ data, onClose, onDone }: { data: Store | null; onClose: () => void; onDone: (msg: string) => void }) {
  const { store, update, replace } = useStore();
  const [confirmReplace, setConfirmReplace] = useState(false);
  const summary = useMemo(() => (data ? mergeStores(store, data).summary : null), [store, data]);

  const close = () => { setConfirmReplace(false); onClose(); };
  const lines: string[] = [];
  if (summary) {
    for (const p of summary.played) {
      const parts = [p.added && `${plural(p.added, 'case')} newly played`, p.removed && `${plural(p.removed, 'case')} un-marked`].filter(Boolean);
      lines.push(`${p.name}: ${parts.join(', ')}`);
    }
    if (summary.groupsAdded.length) lines.push(`New ${summary.groupsAdded.length === 1 ? 'group' : 'groups'}: ${summary.groupsAdded.join(', ')}`);
    if (summary.groupsMatched.length) lines.push(`Joined with your group of the same name: ${summary.groupsMatched.join(', ')}`);
    if (summary.groupsRenamed.length) lines.push(`Renamed: ${summary.groupsRenamed.join(', ')}`);
    if (summary.groupsDeleted.length) lines.push(`Removed (deleted on the other device): ${summary.groupsDeleted.join(', ')}`);
  }

  return (
    <Sheet open={data !== null} onClose={close} title="Import progress">
      {data && summary && (
        <div className="space-y-4 text-[16px] leading-relaxed">
          {!confirmReplace ? (
            <>
              <div>
                <p className="font-semibold">Merging adds this file’s history to this device:</p>
                {summary.changed ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5">{lines.map((l) => <li key={l}>{l}</li>)}</ul>
                ) : (
                  <p className="mt-2 text-muted">Nothing new. This device already has everything in that file.</p>
                )}
              </div>
              <p className="text-sm text-muted">Your settings, filters and who’s playing stay as they are on this device.</p>
              <div className="grid gap-2 pt-1">
                <Button
                  variant="primary"
                  className="min-h-13"
                  onClick={() => { update((s) => mergeStores(s, data).store); onDone(summary.changed ? 'Progress merged.' : 'Already up to date.'); close(); }}
                >
                  Merge
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={close}>Cancel</Button>
                  <Button className="text-title" onClick={() => setConfirmReplace(true)}>Replace instead…</Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <p>
                Replacing throws away everything on this device, including its settings, and uses the file instead:{' '}
                {plural(data.groups.length, 'group')}, {plural(Object.keys(data.played.me ?? {}).length, 'case')} played by you.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button onClick={() => setConfirmReplace(false)}>Back</Button>
                <Button variant="danger" onClick={() => { replace(data); onDone('Progress replaced.'); close(); }}>Replace everything</Button>
              </div>
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}
