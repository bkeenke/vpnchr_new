import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Telegram WebApp в веб-версии Telegram открывает кабинет во фрейме
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org" },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  // Самодостаточная сборка для Docker (node server.js без node_modules)
  output: 'standalone',
  poweredByHeader: false,
  // Только для next dev: открывать стенд с телефона по IP локальной сети (по умолчанию разрешён лишь localhost)
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.*.*.*', '127.0.0.1', '0.0.0.0', '*.local'],
  images: { formats: ['image/avif', 'image/webp'] },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
