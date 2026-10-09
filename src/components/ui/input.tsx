import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

const base =
  'h-12 w-full rounded-xl border border-line bg-black/30 px-4 text-[15px] text-text placeholder:text-muted/70 outline-none transition focus:border-green focus:shadow-[0_0_0_3px_rgba(34,229,140,.18)] disabled:opacity-60';

type FieldProps = { label?: string; error?: string | false; hint?: string };

/** suffix — кнопка/иконка внутри поля справа. */
export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & FieldProps & { suffix?: React.ReactNode }>(function Input(
  { label, error, hint, suffix, className, id, ...props },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="text-muted block text-sm font-medium">
          {label}
        </label>
      )}
      <div className="relative">
        <input ref={ref} id={inputId} aria-invalid={!!error} className={cn(base, error && 'border-danger', suffix && 'pr-12', className)} {...props} />
        {suffix && <div className="absolute inset-y-0 right-1 flex items-center">{suffix}</div>}
      </div>
      {error ? <p className="text-danger text-xs">{error}</p> : hint ? <p className="text-muted text-xs">{hint}</p> : null}
    </div>
  );
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & FieldProps>(function Select(
  { label, error, className, id, children, ...props },
  ref,
) {
  const auto = useId();
  const selectId = id ?? auto;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="text-muted block text-sm font-medium">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={cn(
          base,
          'bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 fill=%27none%27 stroke=%27%2322e58c%27 stroke-width=%272%27%3E%3Cpath d=%27m4 6 4 4 4-4%27/%3E%3C/svg%3E")] appearance-none bg-[position:right_1rem_center] bg-no-repeat pr-10',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-danger text-xs">{error}</p>}
    </div>
  );
});

export function Checkbox({ label, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label className={cn('text-muted flex cursor-pointer items-start gap-3 text-sm', className)}>
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[#22e58c]" {...props} />
      <span>{label}</span>
    </label>
  );
}
