'use client';

import { useEffect } from 'react';
import { ShieldMark } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main className="grid min-h-[70svh] place-items-center px-4 text-center">
      <div>
        <ShieldMark className="mx-auto size-20 opacity-60 grayscale" />
        <h1 className="font-display mt-6 text-2xl font-bold uppercase">Что-то пошло не так</h1>
        <p className="text-muted mt-2">Сервер не ответил. Попробуйте ещё раз через минуту.</p>
        <Button className="mt-6" onClick={reset}>
          Повторить
        </Button>
      </div>
    </main>
  );
}
