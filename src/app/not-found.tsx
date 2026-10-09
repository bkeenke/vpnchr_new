import Link from 'next/link';
import { ShieldMark, Wordmark } from '@/components/brand/logo';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center px-4 text-center">
      <div>
        <ShieldMark className="mx-auto size-24" />
        <p className="font-display mt-6 text-6xl font-black">
          <span className="text-chrome">4</span>
          <span className="text-emerald">0</span>
          <span className="text-chrome">4</span>
        </p>
        <p className="text-muted mt-3">Такой страницы нет — но свобода всё ещё рядом.</p>
        <Link href="/" className={buttonVariants({ className: 'mt-8' })}>
          На главную <Wordmark className="text-sm" />
        </Link>
      </div>
    </main>
  );
}
