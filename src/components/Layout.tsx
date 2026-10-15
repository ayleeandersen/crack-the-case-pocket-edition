import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useStore } from '../state/StoreContext';
import { ProfileSwitcher } from './ProfileSwitcher';
import { IconBook, IconClose, IconDice, IconSettings } from './Icons';

export function Header() {
  return (
    <header className="pt-safe sticky top-0 z-30 bg-band text-band-ink shadow-md">
      <div className="mx-auto flex h-14 max-w-[640px] items-center justify-between gap-3 px-4">
        <h1 className="min-w-0 font-serif text-[18px] font-bold leading-none tracking-tight">
          <span className="whitespace-nowrap">Crack the Case</span>
          <span className="mt-0.5 block text-[12px] font-normal italic opacity-80">Pocket Edition</span>
        </h1>
        <ProfileSwitcher />
      </div>
    </header>
  );
}

export function StorageNotice() {
  const { persistent } = useStore();
  const [dismissed, setDismissed] = useState(false);
  if (persistent || dismissed) return null;
  return (
    <div role="status" className="mx-auto flex max-w-[640px] items-start gap-2 border-b border-callout-line bg-callout px-4 py-2 text-sm">
      <span className="flex-1">This browser isn’t letting the app save data, so progress will only last until you close it.</span>
      <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss" className="-my-2 grid size-11 place-items-center"><IconClose width={18} height={18} /></button>
    </div>
  );
}

function Tab({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[13px] font-semibold ${isActive ? 'text-title' : 'text-muted'}`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`grid h-7 w-14 place-items-center rounded-full ${isActive ? 'bg-surface-2' : ''}`}>{icon}</span>
          {label}
        </>
      )}
    </NavLink>
  );
}

export function TabLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <StorageNotice />
      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface">
        <div className="mx-auto flex max-w-[640px]">
          <Tab to="/play" label="Play" icon={<IconDice />} />
          <Tab to="/library" label="Library" icon={<IconBook />} />
          <Tab to="/groups" label="Settings" icon={<IconSettings />} />
        </div>
      </nav>
    </div>
  );
}
