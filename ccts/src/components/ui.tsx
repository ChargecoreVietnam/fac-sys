'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

export type Tone = 'ok' | 'bad' | 'na' | 'warn' | 'brand' | 'muted';

const TONE_CHIP: Record<Tone, string> = {
  ok: 'bg-ok-soft text-ok',
  bad: 'bg-bad-soft text-bad',
  na: 'bg-na-soft text-na',
  warn: 'bg-warn-soft text-warn',
  brand: 'bg-brand-soft text-brand',
  muted: 'bg-card-2 text-ink-2',
};

export const TONE_BAR: Record<Tone, string> = {
  ok: 'bg-ok',
  bad: 'bg-bad',
  na: 'bg-na',
  warn: 'bg-warn',
  brand: 'bg-brand',
  muted: 'bg-line-2',
};

/* ------------------------------------------------------------------ khung */

export function AppBar({
  title,
  sub,
  back,
  right,
}: {
  title: ReactNode;
  sub?: ReactNode;
  back?: string;
  right?: ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-3">
        {back ? (
          <button
            type="button"
            onClick={() => router.push(back)}
            aria-label="Quay lại"
            className="-ml-1 flex size-10 shrink-0 items-center justify-center rounded-full text-ink-2 active:bg-card-2"
          >
            <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden="true">
              <path
                d="M15 5l-7 7 7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[0.95rem] font-semibold leading-tight">{title}</div>
          {sub ? (
            <div className="truncate text-xs leading-tight text-ink-2">{sub}</div>
          ) : null}
        </div>
        {right}
      </div>
    </header>
  );
}

export function Page({ children }: { children: ReactNode }) {
  // pb chừa chiều cao thanh dưới (~73px) cộng vùng home indicator của iPhone.
  return (
    <main className="animate-fade-up mx-auto w-full max-w-2xl flex-1 px-3 pb-28 pt-3">
      {children}
    </main>
  );
}

export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur">
      <div className="safe-b mx-auto flex max-w-2xl gap-2 px-3 pt-3">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------- nét */

export function Card({
  children,
  stripe,
  className = '',
}: {
  children: ReactNode;
  stripe?: Tone;
  className?: string;
}) {
  return (
    <section
      className={
        'relative overflow-hidden rounded-xl border border-line bg-card ' + className
      }
    >
      {stripe ? (
        <span
          aria-hidden="true"
          className={'absolute inset-y-0 left-0 w-1 ' + TONE_BAR[stripe]}
        />
      ) : null}
      {children}
    </section>
  );
}

export function Chip({
  children,
  tone = 'muted',
  mono,
}: {
  children: ReactNode;
  tone?: Tone;
  mono?: boolean;
}) {
  return (
    <span
      className={
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold leading-5 ' +
        (mono ? 'font-mono tracking-tight ' : 'uppercase tracking-wide ') +
        TONE_CHIP[tone]
      }
    >
      {children}
    </span>
  );
}

export function SectionTitle({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-baseline justify-between gap-3 first:mt-0">
      <h2 className="text-[0.72rem] font-bold uppercase tracking-[0.12em] text-ink-2">
        {children}
      </h2>
      {note ? <span className="tnum text-xs text-ink-3">{note}</span> : null}
    </div>
  );
}

export function Banner({
  tone,
  title,
  children,
}: {
  tone: Tone;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={'rounded-lg px-3 py-2.5 text-sm ' + TONE_CHIP[tone]}>
      <p className="font-semibold">{title}</p>
      {children ? <div className="mt-1 opacity-90">{children}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ nhập */

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[0.78rem] font-semibold text-ink-2">
        {label}
        {required ? <span className="text-bad"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="text-xs text-ink-3">{hint}</span> : null}
    </label>
  );
}

const inputCls =
  'w-full rounded-lg border border-line bg-card-2 px-3 py-2.5 text-ink placeholder:text-ink-3 ' +
  'focus:border-brand focus:bg-card focus:outline-none disabled:opacity-60';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return <input {...rest} className={inputCls + ' ' + className} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', rows = 2, ...rest } = props;
  return <textarea rows={rows} {...rest} className={inputCls + ' resize-y ' + className} />;
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={
        'flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60 ' +
        (checked
          ? 'border-brand bg-brand-soft text-brand'
          : 'border-line bg-card-2 text-ink-2')
      }
    >
      <span
        aria-hidden="true"
        className={
          'flex size-5 shrink-0 items-center justify-center rounded border-2 ' +
          (checked ? 'border-brand bg-brand text-on-brand' : 'border-line-2')
        }
      >
        {checked ? (
          <svg viewBox="0 0 20 20" className="size-3.5" fill="none">
            <path
              d="M4 10.5l4 4 8-9"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      {label}
    </button>
  );
}

export interface SegOption<T extends string> {
  value: T;
  label: string;
  tone: Tone;
}

export function Seg<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: SegOption<T>[];
  value: T | null;
  onChange: (v: T | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            aria-pressed={on}
            onClick={() => onChange(on ? null : o.value)}
            className={
              'min-h-11 rounded-lg border px-2 text-sm font-semibold transition-colors disabled:opacity-60 ' +
              (on
                ? TONE_CHIP[o.tone] + ' border-current'
                : 'border-line bg-card-2 text-ink-3')
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ nút */

const btnBase =
  'inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-[0.95rem] font-semibold transition-[color,background-color,transform] active:scale-[0.98] disabled:opacity-45 disabled:active:scale-100';

export function Button({
  variant = 'primary',
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger';
}) {
  const v =
    variant === 'primary'
      ? 'bg-brand text-on-brand active:bg-brand-2'
      : variant === 'danger'
        ? 'bg-bad-soft text-bad active:brightness-95'
        : 'border border-line bg-card text-ink-2 active:bg-card-2';
  return <button {...rest} className={btnBase + ' ' + v + ' ' + className} />;
}

export function LinkButton({
  href,
  children,
  variant = 'primary',
}: {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'ghost';
}) {
  const v =
    variant === 'primary'
      ? 'bg-brand text-on-brand active:bg-brand-2'
      : 'border border-line bg-card text-ink-2 active:bg-card-2';
  return (
    <Link href={href} className={btnBase + ' ' + v}>
      {children}
    </Link>
  );
}

export function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center p-16 text-sm text-ink-3">
      Đang tải…
    </div>
  );
}
