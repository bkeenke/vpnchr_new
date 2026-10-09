'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { shmMessage } from '@/lib/shm-messages';
import { toast } from '@/lib/toast';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function PromoModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Промокод" size="sm">
      <PromoForm onDone={() => onOpenChange(false)} />
    </Modal>
  );
}

function PromoForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function apply() {
    if (!code.trim()) return toast.error('Введите промокод');
    setLoading(true);
    try {
      await api.get(`/promo/apply/${encodeURIComponent(code.trim())}`);
      toast.success('Промокод применён');
      onDone();
      router.refresh();
    } catch (e) {
      toast.error(shmMessage((e as ApiError).data?.error, 'Не удалось применить промокод'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void apply();
      }}
    >
      <Input
        label="Промокод"
        placeholder="Например, FREEDOM"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        autoFocus
        className="font-mono uppercase"
      />
      <Button type="submit" block loading={loading}>
        Применить
      </Button>
    </form>
  );
}
