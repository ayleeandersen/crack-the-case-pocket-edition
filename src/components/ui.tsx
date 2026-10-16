import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Difficulty } from '../types';
import { IconCheck, IconClose } from './Icons';

export const DIFF_BG: Record<Difficulty, string> = { Easy: 'bg-easy', Medium: 'bg-medium', Difficult: 'bg-difficult' };

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={`${DIFF_BG[difficulty]} inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-white`}>
      {difficulty}
    </span>
  );
}

export function DifficultyDot({ difficulty }: { difficulty: Difficulty }) {
  return <span aria-hidden className={`${DIFF_BG[difficulty]} inline-block size-3 shrink-0 rounded-full ring-2 ring-white/40`} />;
}

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
const VARIANTS: Record<BtnVariant, string> = {
  primary: 'bg-accent text-accent-ink shadow-sm active:brightness-90',
  secondary: 'bg-surface text-ink border border-line active:bg-surface-2',
  ghost: 'text-ink active:bg-surface-2',
  danger: 'bg-[#8a1520] text-white active:brightness-90',
};

export function Button({
  variant = 'secondary', className = '', children, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3.5 text-[15px] font-semibold disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Toggle chip. `locked` = turning off would leave none, so it shakes instead. */
export function Chip({
  label, pressed, onToggle, locked, color,
}: { label: string; pressed: boolean; onToggle: () => void; locked: boolean; color?: string }) {
  const [shaking, setShaking] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => {
        if (pressed && locked) {
          setShaking(false);
          requestAnimationFrame(() => setShaking(true));
          return;
        }
        onToggle();
      }}
      onAnimationEnd={() => setShaking(false)}
      // The button is the full 44px tap target; the 36px pill is drawn inside it.
      className={`chip group inline-flex h-11 items-center ${shaking ? 'shake' : ''}`}
    >
      <span
        className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-semibold transition-colors group-focus-visible:outline-3 group-focus-visible:outline-offset-2 group-focus-visible:outline-[#e2a33b] ${
          pressed ? 'border-pressed-line bg-pressed text-pressed-ink' : 'border-line border-dashed bg-transparent text-muted'
        }`}
      >
        {pressed ? <IconCheck width={14} height={14} strokeWidth={3} /> : color && <span aria-hidden className={`${color} size-2.5 rounded-full opacity-60`} />}
        {pressed && color && <span aria-hidden className={`${color} size-2.5 rounded-full ring-2 ring-white/70`} />}
        {label}
      </span>
    </button>
  );
}

/** Generic multi-select chip row enforcing "at least one stays on". */
export function ChipGroup<T extends string>({
  label, options, selected, onChange, render, colors,
}: {
  label: string;
  options: T[];
  selected: T[];
  onChange: (next: T[]) => void;
  render: (o: T) => string;
  colors?: Partial<Record<T, string>>;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-x-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <Chip
            key={o}
            label={render(o)}
            pressed={on}
            locked={on && selected.length === 1}
            color={colors?.[o]}
            onToggle={() => onChange(on ? selected.filter((x) => x !== o) : options.filter((x) => x === o || selected.includes(x)))}
          />
        );
      })}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // Depends on `open` only, so re-renders never steal focus from inputs inside the sheet.
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  // Portaled to <body> so a parent's stacking context (e.g. the sticky header) can't put it under the tab bar.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="presentation">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="sheet-in pb-safe relative max-h-[85dvh] w-full max-w-[640px] overflow-y-auto rounded-t-3xl border-t border-line bg-surface text-ink shadow-2xl outline-none"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-5 py-3">
          <h2 id={titleId} className="font-serif text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="-mr-2 grid size-11 place-items-center rounded-full active:bg-surface-2" aria-label="Close">
            <IconClose />
          </button>
        </div>
        <div className="px-5 pb-6 pt-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open, title, body, confirmLabel, danger, onConfirm, onCancel, requireText, extra,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  requireText?: string;
  extra?: ReactNode;
}) {
  const [typed, setTyped] = useState('');
  useEffect(() => { if (open) setTyped(''); }, [open]);
  const blocked = requireText !== undefined && typed.trim() !== requireText;
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      <div className="space-y-4 text-[16px] leading-relaxed">
        <div>{body}</div>
        {requireText && (
          <label className="block">
            <span className="mb-1 block text-sm text-muted">Type {requireText} to confirm</span>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
              className="min-h-11 w-full rounded-xl border border-line bg-paper px-3 text-lg tracking-widest"
            />
          </label>
        )}
        {extra}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} disabled={blocked} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </Sheet>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 py-1">
      <span>
        <span className="block font-semibold">{label}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
      </span>
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-7 w-12 rounded-full bg-line transition-colors peer-checked:bg-accent peer-focus-visible:outline-3 peer-focus-visible:outline-[#e2a33b]" />
        <span className="absolute left-1 top-1 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-xl border border-line bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-10 flex-1 rounded-lg px-2 text-[15px] font-semibold ${value === o.value ? 'bg-pressed text-pressed-ink' : 'text-muted'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SectionLabel({ children, as: As = 'h2', className = '' }: { children: ReactNode; as?: 'h2' | 'h3'; className?: string }) {
  return <As className={`font-sans text-[13px] font-bold uppercase tracking-[0.18em] text-muted ${className}`}>{children}</As>;
}

/** Paragraph list; very short lines (tattoo letters, rhymes) are centered. */
export function Paragraphs({ items }: { items: string[] }) {
  return (
    <>
      {items.map((p, i) => (
        <p key={i} className={p.trim().length < 15 ? 'setapart' : undefined}>{p}</p>
      ))}
    </>
  );
}
