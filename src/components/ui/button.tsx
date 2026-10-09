import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { IconLoader2 } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none',
  {
    variants: {
      variant: {
        // Главная кнопка макета: тёмная капсула с неоновой обводкой
        neon: 'neon-ring bg-[linear-gradient(180deg,rgba(18,54,38,.85),rgba(4,16,11,.92))] text-white hover:shadow-[0_0_0_1px_rgba(40,245,154,.8),0_0_32px_rgba(40,245,154,.55)] hover:-translate-y-px',
        solid: 'bg-green text-[#03140c] hover:bg-green-bright shadow-[0_0_24px_rgba(34,229,140,.35)]',
        ghost: 'border border-line bg-white/[.03] text-text hover:border-line-green hover:bg-white/[.06]',
        subtle: 'text-muted hover:text-text hover:bg-white/[.05]',
        danger: 'border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20',
        warning: 'border border-warning/40 bg-warning/10 text-warning hover:bg-warning/20',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-6 text-[15px]',
        lg: 'h-14 px-8 text-base uppercase tracking-wide',
        icon: 'h-10 w-10',
      },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'neon', size: 'md' },
  },
);

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { loading?: boolean };

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant, size, block, loading, disabled, children, type = 'button', ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cn(buttonVariants({ variant, size, block }), className)} disabled={disabled || loading} {...props}>
      {loading && <IconLoader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
