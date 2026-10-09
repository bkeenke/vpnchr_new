'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconX } from '@tabler/icons-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { pay, usePaySystems } from '@/lib/payments';
import { Modal, ConfirmModal } from '@/components/ui/modal';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const PRESETS = [200, 300, 500, 1000];

type Props = { open: boolean; onOpenChange: (o: boolean) => void; initialAmount?: number };

/** Содержимое модалки монтируется при открытии — состояние формы каждый раз свежее. */
export function PayModal({ open, onOpenChange, initialAmount }: Props) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Пополнить баланс" size="sm">
      <PayForm initialAmount={initialAmount} onClose={() => onOpenChange(false)} />
    </Modal>
  );
}

function PayForm({ initialAmount, onClose }: { initialAmount?: number; onClose: () => void }) {
  const router = useRouter();
  const { items, loading, reload } = usePaySystems();
  const [picked, setPicked] = useState('');
  const [amount, setAmount] = useState<string>(String(initialAmount ?? 200));
  const [processing, setProcessing] = useState(false);
  const [toDelete, setToDelete] = useState<{ paysystem: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const selected = items.some((p) => p.shm_url === picked) ? picked : (items[0]?.shm_url ?? '');

  const saved = items.filter((p) => p.allow_deletion === 1);

  async function submit() {
    const ps = items.find((p) => p.shm_url === selected);
    const value = Number(amount);
    if (!ps) return toast.error('Выберите способ оплаты');
    if (!value || value <= 0) return toast.error('Введите сумму');
    setProcessing(true);
    try {
      const r = await pay(ps, value);
      if (!r.ok) return void toast.error(r.error || 'Ошибка оплаты');
      toast.success(r.instant ? 'Оплата прошла успешно' : 'Страница оплаты открыта в новой вкладке');
      onClose();
      router.refresh();
    } catch {
      toast.error('Ошибка оплаты');
    } finally {
      setProcessing(false);
    }
  }

  async function deleteAutopay() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.del('/user/autopayment', { pay_system: toDelete.paysystem });
      toast.success('Способ оплаты удалён');
      setToDelete(null);
      reload();
    } catch {
      toast.error('Не удалось удалить способ оплаты');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {loading && !items.length ? (
        <p className="text-muted py-6 text-center text-sm">Загружаем способы оплаты…</p>
      ) : !items.length ? (
        <p className="text-muted py-6 text-center text-sm">Способы оплаты недоступны</p>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {saved.length > 0 && (
            <div className="border-line rounded-xl border p-3">
              <p className="text-muted mb-2 text-xs font-semibold tracking-wider uppercase">Сохранённые способы</p>
              {saved.map((p) => (
                <div key={p.paysystem} className="flex items-center justify-between gap-2 py-1 text-sm">
                  <span className="flex items-center gap-2">
                    {p.name} <Badge tone="blue">Автоплатёж</Badge>
                  </span>
                  <button
                    type="button"
                    className="text-muted hover:bg-danger/10 hover:text-danger rounded-full p-1.5"
                    aria-label={`Удалить ${p.name}`}
                    onClick={() => setToDelete({ paysystem: p.paysystem, name: p.name })}
                  >
                    <IconX className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Select label="Способ оплаты" value={selected} onChange={(e) => setPicked(e.target.value)}>
            {items.map((p) => (
              <option key={p.shm_url} value={p.shm_url}>
                {p.name}
              </option>
            ))}
          </Select>

          <div className="space-y-2">
            <Input label="Сумма, ₽" type="number" inputMode="decimal" min={1} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(String(v))}
                  className={`rounded-full border px-3 py-1 text-sm transition ${Number(amount) === v ? 'border-green bg-green/10 text-green' : 'border-line text-muted hover:text-text'}`}
                >
                  {v} ₽
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" size="lg" block loading={processing}>
            Оплатить {Number(amount) > 0 ? `${amount} ₽` : ''}
          </Button>
        </form>
      )}

      <ConfirmModal
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Удалить способ оплаты?"
        message={`Автоплатежи через «${toDelete?.name}» больше не будут списываться.`}
        confirmLabel="Удалить"
        loading={deleting}
        onConfirm={deleteAutopay}
      />
    </>
  );
}
