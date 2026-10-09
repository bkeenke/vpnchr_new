'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { IconX } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
};

export function Modal({ open, onOpenChange, title, description, children, size = 'md' }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-[fade_.15s_ease-out]" />
        <Dialog.Content
          className={cn(
            'glass shadow-card fixed z-50 flex max-h-[92svh] flex-col overflow-hidden bg-[#07100c]/95 outline-none',
            // мобильный — лист снизу, десктоп — по центру
            'inset-x-0 bottom-0 rounded-t-3xl sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl',
            size === 'sm' && 'sm:max-w-md',
            size === 'md' && 'sm:max-w-lg',
            size === 'lg' && 'sm:max-w-2xl',
          )}
        >
          <div className="border-line flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6">
            <div>
              <Dialog.Title className="font-display text-lg font-bold uppercase">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="text-muted mt-1 text-sm">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{String(title)}</Dialog.Description>
              )}
            </div>
            <Dialog.Close className="text-muted hover:text-text -mr-2 rounded-full p-2 transition hover:bg-white/5" aria-label="Закрыть">
              <IconX className="size-5" />
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel,
  tone = 'danger',
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'warning' | 'neon';
  loading?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} size="sm">
      <p className="text-muted text-sm">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
          Отмена
        </Button>
        <Button variant={tone} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
