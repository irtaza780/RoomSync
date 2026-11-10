import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import type { Member, MemberId } from '../domain/types';

export function cx(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(' ');
}

// ---------------------------------------------------------------------------

const AVATAR_SIZES = { xs: 'size-6 text-[10px]', sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-14 text-lg' } as const;

export function Avatar({ member, size = 'sm', ring }: { member: Member; size?: keyof typeof AVATAR_SIZES; ring?: boolean }) {
  return (
    <span
      aria-hidden
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold text-ink/85 select-none',
        AVATAR_SIZES[size],
        ring && 'ring-2 ring-surface',
      )}
      style={{ backgroundColor: member.color }}
    >
      {member.initials}
    </span>
  );
}

// ---------------------------------------------------------------------------

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'dark';

export function Button({
  variant = 'primary',
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const styles: Record<BtnVariant, string> = {
    primary: 'bg-mustard text-ink hover:bg-mustard-600 disabled:bg-mustard/50',
    dark: 'bg-ink text-surface hover:bg-ink-2 disabled:bg-ink/40',
    secondary: 'bg-cream text-ink hover:bg-line disabled:opacity-50',
    ghost: 'bg-transparent text-ink-2 hover:bg-cream disabled:opacity-50',
  };
  return (
    <button
      type="button"
      className={cx(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition-colors',
        styles[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------

export function Card({ children, className, onClick, label }: { children: ReactNode; className?: string; onClick?: () => void; label?: string }) {
  const base = 'block w-full rounded-3xl bg-surface p-4 text-left shadow-card ring-1 ring-line/70';
  if (onClick)
    return (
      <button type="button" aria-label={label} onClick={onClick} className={cx(base, 'transition hover:ring-mustard/60 active:scale-[0.99]', className)}>
        {children}
      </button>
    );
  return <div className={cx(base, className)}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between px-1">
      <h2 className="text-[13px] font-bold uppercase tracking-wide text-muted">{children}</h2>
      {action}
    </div>
  );
}

export function LinkButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="min-h-8 rounded-lg px-1 text-[13px] font-semibold text-mustard-600 hover:underline">
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------

export function Field({
  label,
  error,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-semibold text-ink-2">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1.5 flex items-start gap-1 text-[13px] font-medium text-bad">
          {error}
        </p>
      )}
      {hint && <div className="mt-1.5 text-[13px] text-muted">{hint}</div>}
    </div>
  );
}

export function TextInput({
  invalid,
  prefix,
  suffix,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; prefix?: string; suffix?: string }) {
  return (
    <div
      className={cx(
        'flex min-h-12 items-center rounded-2xl bg-cream px-3.5 ring-1 transition focus-within:ring-2',
        invalid ? 'ring-bad/70 focus-within:ring-bad' : 'ring-line focus-within:ring-mustard',
        className,
      )}
    >
      {prefix && <span className="mr-1.5 text-muted">{prefix}</span>}
      <input
        aria-invalid={invalid || undefined}
        className="w-full min-w-0 bg-transparent py-2.5 text-[15px] text-ink outline-none placeholder:text-muted/70"
        {...rest}
      />
      {suffix && <span className="ml-1.5 text-muted">{suffix}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function MemberPicker({
  members,
  value,
  onChange,
  label,
  youId,
  youLabel,
  invalid,
  disabledId,
}: {
  members: Member[];
  value: MemberId | '';
  onChange: (id: MemberId) => void;
  label: string;
  youId?: MemberId;
  youLabel?: string;
  invalid?: boolean;
  disabledId?: MemberId;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cx('grid grid-cols-3 gap-2 rounded-2xl', invalid && 'ring-2 ring-bad/60 p-1')}>
      {members.map((m) => {
        const active = value === m.id;
        const disabled = disabledId === m.id;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(m.id)}
            className={cx(
              'flex min-h-12 items-center gap-2 rounded-2xl px-2.5 py-2 text-left text-sm font-semibold ring-1 transition',
              active ? 'bg-mustard-50 ring-2 ring-mustard' : 'bg-cream ring-line hover:ring-mustard/50',
              disabled && 'opacity-40',
            )}
          >
            <Avatar member={m} size="xs" />
            <span className="truncate">
              {m.name}
              {youId === m.id && youLabel ? <span className="block text-[11px] font-medium text-muted">{youLabel}</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-2xl bg-cream p-1 ring-1 ring-line">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex-1 rounded-xl font-semibold transition',
            size === 'sm' ? 'min-h-8 px-2 text-xs' : 'min-h-10 px-3 text-sm',
            value === o.value ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

/** Bottom sheet rendered inside the phone viewport. */
export function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    panel.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end">
      <div className="absolute inset-0 animate-fade-in bg-ink/35" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[92%] animate-sheet-up flex-col rounded-t-[28px] bg-surface shadow-sheet outline-none"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line" aria-hidden />
        <div className="flex items-center justify-between px-5 pb-2 pt-3">
          <h2 id={titleId} className="text-lg font-bold">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full bg-cream text-ink-2 hover:bg-line" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="scrollbar-none overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="border-t border-line bg-surface px-5 pb-5 pt-3">{footer}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function EmptyState({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-line px-6 py-8 text-center text-sm text-muted">
      <span className="grid size-11 place-items-center rounded-full bg-cream text-mustard-600">{icon}</span>
      {children}
    </div>
  );
}

export function balanceTone(cents: number): string {
  // Red is reserved for errors and overdue items; negative balances use ink plus an explicit sign and label.
  return cents > 0 ? 'text-good' : 'text-ink';
}
