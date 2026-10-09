import { cn } from '@/lib/utils';

export function Card({ className, glow, ...props }: React.HTMLAttributes<HTMLDivElement> & { glow?: boolean }) {
  return <div className={cn('min-w-0 rounded-2xl p-5 sm:p-6', glow ? 'glass-green' : 'glass', className)} {...props} />;
}

export function Eyebrow({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-green text-xs font-semibold tracking-[0.2em] uppercase', className)} {...props} />;
}

export function PageTitle({ title, eyebrow, children }: { title: string; eyebrow?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
        <h1 className="font-display text-2xl font-bold uppercase sm:text-3xl">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border-line flex items-center justify-between gap-4 border-b py-2.5 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="border-line text-muted rounded-2xl border border-dashed px-6 py-12 text-center">{children}</div>;
}
