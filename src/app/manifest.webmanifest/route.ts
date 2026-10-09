import { connection } from 'next/server';
import { getPublicConfig } from '@/lib/config';

/** Манифест PWA — имя приложения из конфига SHM во время работы, а не сборки. */
export async function GET() {
  await connection();
  const { appName, appDescription } = await getPublicConfig();
  return Response.json(
    {
      name: appName,
      short_name: appName,
      description: appDescription,
      start_url: '/services',
      scope: '/',
      display: 'standalone',
      background_color: '#050807',
      theme_color: '#050807',
      lang: 'ru',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600' } },
  );
}
