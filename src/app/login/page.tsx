import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/shm';
import { safeNext } from '@/lib/utils';
import { Wordmark } from '@/components/brand/logo';
import { LoginForm } from '@/components/auth/login-form';
import heroImage from '../../../public/images/hero-mobile.webp';

export const metadata: Metadata = { title: 'Вход' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  // Со ссылкой сброса пароля пускаем и залогиненных
  if (user && !sp.token) redirect(safeNext(sp.next));

  return (
    <main className="relative isolate grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      <Image src={heroImage} alt="" fill priority placeholder="blur" sizes="100vw" className="-z-20 object-cover object-[65%_center]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(5,8,7,.7),rgba(5,8,7,.55)_40%,rgba(5,8,7,.95))] lg:bg-[linear-gradient(90deg,rgba(5,8,7,.25),rgba(5,8,7,.55)_50%,rgba(5,8,7,.96)_62%)]" />

      {/* Левая часть — бренд (только десктоп) */}
      <section className="hidden flex-col justify-between p-10 lg:flex">
        <Link href="/" aria-label="На главную">
          <Wordmark className="text-3xl" />
        </Link>
        <div>
          <p className="tracking-hero text-sm text-white uppercase">Твоя свобода в одно касание</p>
          <p className="font-script mt-6 -rotate-3 text-5xl text-white drop-shadow-lg">Свобода объединяет</p>
        </div>
      </section>

      {/* Правая часть — форма */}
      <section className="flex flex-col items-center justify-center gap-8 px-4 py-10 sm:px-6">
        <Link href="/" className="lg:hidden" aria-label="На главную">
          <Wordmark className="text-5xl" />
        </Link>
        <Suspense>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
