import type { Metadata, Viewport } from 'next';
import { Montserrat, Unbounded, Marck_Script } from 'next/font/google';
import Script from 'next/script';
import { connection } from 'next/server';
import { Toaster } from 'sonner';
import { getPublicConfig } from '@/lib/config';
import { ConfigProvider } from '@/components/providers/config';
import './globals.css';

const montserrat = Montserrat({ subsets: ['latin', 'cyrillic'], variable: '--font-montserrat', display: 'swap' });
const unbounded = Unbounded({ subsets: ['latin', 'cyrillic'], variable: '--font-unbounded', weight: ['500', '700', '900'], display: 'swap' });
const marck = Marck_Script({ subsets: ['latin', 'cyrillic'], variable: '--font-marck', weight: '400', display: 'swap' });

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getPublicConfig();
  return {
    title: { default: `${cfg.appName} — твоя свобода в одно касание`, template: `%s · ${cfg.appName}` },
    description: cfg.appDescription,
    manifest: '/manifest.webmanifest',
    appleWebApp: { capable: true, title: cfg.appName, statusBarStyle: 'black-translucent' },
  };
}

export const viewport: Viewport = {
  themeColor: '#050807',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Конфиг приходит из SHM во время работы (с кэшем) — один образ для любой инсталляции
  await connection();
  const config = await getPublicConfig();
  return (
    <html lang="ru" className={`${montserrat.variable} ${unbounded.variable} ${marck.variable}`}>
      <body className="min-h-svh overflow-x-hidden">
        {config.telegram.webAppAuth && <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />}
        <ConfigProvider value={config}>{children}</ConfigProvider>
        <Toaster theme="dark" position="top-center" richColors toastOptions={{ className: '!rounded-2xl !border-line !bg-[#0b1511] !font-sans' }} />
      </body>
    </html>
  );
}
