import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import type { Member, MemberId } from '../domain/types';

export function cx(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(' ');
}

// ---------------------------------------------------------------------------

const AVATAR_SIZES = { xs: 'size-6 text-[9.5px]', sm: 'size-8 text-[11px]', md: 'size-10 text-[13px]', lg: 'size-12 text-base' } as const;

export function Avatar({ member, size = 'sm', ring }: { member: Member; size?: keyof typeof AVATAR_SIZES; ring?: boolean }) {
  return (
    <span
      aria-hidden
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold text-ink/80 select-none',
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

type BtnVariant = 'primary' | 'accent' | 'secondary' | 'ghost';

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' }) {
  const styles: Record<BtnVariant, string> = {
    primary: 'bg-pine text-white hover:bg-pine-700 disabled:bg-pine/45',
    accent: 'bg-mustard text-ink hover:bg-[#cb960f] disabled:bg-mustard/50',
    secondary: 'bg-cream text-ink hover:bg-line disabled:opacity-50',
    ghost: 'bg-transparent text-pine hover:bg-pine-50 disabled:opacity-50',
  };
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-semibold transition-colors',
        size === 'sm' ? 'min-h-9 px-3.5 text-[13px]' : 'min-h-11 px-5 text-sm',
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

/** Quiet grouped surface. Rows inside use `divide-y`. */
export function Group({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-[20px] bg-surface ring-1 ring-line', className)}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-7 flex min-h-8 items-center justify-between px-1">
      <h2 className="text-[13px] font-semibold text-muted">{children}</h2>
      {action}
    </div>
  );
}

export function LinkButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="min-h-8 rounded-full px-2 text-[13px] font-semibold text-pine hover:bg-pine-50">
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
    <div className="mb-5">
      <label htmlFor={htmlFor} className="mb-1.5 block text-[12.5px] font-semibold text-muted">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1.5 text-[12.5px] font-medium text-bad">
          {error}
        </p>
      )}
      {hint && <div className="mt-1.5 text-[12.5px] text-muted">{hint}</div>}
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
        'flex min-h-11 items-center rounded-2xl bg-cream px-3.5 ring-1 transition focus-within:bg-surface focus-within:ring-2',
        invalid ? 'ring-bad/60 focus-within:ring-bad' : 'ring-transparent focus-within:ring-pine',
        className,
      )}
    >
      {prefix && <span className="mr-1.5 text-sm text-muted">{prefix}</span>}
      <input
        aria-invalid={invalid || undefined}
        className="w-full min-w-0 bg-transparent py-2 text-[15px] text-ink outline-none placeholder:text-muted/60"
        {...rest}
      />
      {suffix && <span className="ml-1.5 text-sm text-muted">{suffix}</span>}
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
    <div role="radiogroup" aria-label={label} className={cx('flex gap-2', invalid && 'rounded-2xl p-0.5 ring-2 ring-bad/50')}>
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
              'flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-[13px] font-semibold transition',
              active ? 'bg-pine text-white' : 'bg-cream text-ink hover:bg-line',
              disabled && 'opacity-35',
            )}
          >
            <Avatar member={m} size="xs" />
            <span className="truncate">{youId === m.id && youLabel ? youLabel : m.name}</span>
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
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full bg-cream p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'min-h-9 flex-1 rounded-full px-3 text-[13px] font-semibold transition',
            value === o.value ? 'bg-surface text-ink shadow-card ring-1 ring-line' : 'text-muted hover:text-ink',
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
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <div className="absolute inset-0 animate-fade-in bg-ink/30" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[92%] animate-sheet-up flex-col rounded-t-[28px] bg-surface shadow-sheet outline-none"
      >
        <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-line" aria-hidden />
        <div className="flex items-center justify-between px-5 pb-1 pt-3">
          <h2 id={titleId} className="text-[17px] font-bold tracking-tight">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full bg-cream text-ink-2 hover:bg-line" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="scrollbar-none overflow-y-auto px-5 pb-4 pt-3">{children}</div>
        {footer && <div className="bg-surface px-5 pb-6 pt-2">{footer}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function EmptyState({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-[20px] bg-cream/70 px-4 py-4 text-[13px] text-muted">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-pine">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

export function balanceTone(cents: number): string {
  // Red is reserved for errors and overdue items; negative balances use ink plus an explicit sign and label.
  return cents > 0 ? 'text-pine' : 'text-ink';
}
