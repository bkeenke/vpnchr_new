import { cn } from '@/lib/utils';

/** Словесный знак VPNCHR: хромированное VPN + изумрудное CHR. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-display leading-none font-black tracking-tight', className)} aria-label="VPNCHR">
      <span className="text-chrome">VPN</span>
      <span className="text-emerald">CHR</span>
    </span>
  );
}

/** Щит-эмблема (SVG): хромовая рамка, горы, полосы флага. */
export function ShieldMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 72" className={cn('drop-shadow-[0_0_10px_rgba(34,229,140,.45)]', className)} aria-hidden>
      <defs>
        <linearGradient id="sm-chrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset=".5" stopColor="#8b959b" />
          <stop offset="1" stopColor="#e9eef0" />
        </linearGradient>
        <linearGradient id="sm-face" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0f3a28" />
          <stop offset="1" stopColor="#03110b" />
        </linearGradient>
        <clipPath id="sm-clip">
          <path d="M32 7 55 14v21c0 15-10 25-23 30C19 60 9 50 9 35V14Z" />
        </clipPath>
      </defs>
      <path d="M32 2 60 10v25c0 18-12 30-28 36C16 65 4 53 4 35V10Z" fill="url(#sm-chrome)" />
      <path d="M32 7 55 14v21c0 15-10 25-23 30C19 60 9 50 9 35V14Z" fill="url(#sm-face)" />
      <g clipPath="url(#sm-clip)">
        <path d="m9 32 11-12 6 6 7-10 9 9 5-4 8 11v4H9Z" fill="#dfe6e9" opacity=".92" />
        <path d="m20 20 3 6-3-1-2 3Zm13-4 3 7-3-2-3 3Z" fill="#fff" />
        <path d="M6 48c16-6 32-6 52-12v5C38 47 22 47 6 53Z" fill="#fff" />
        <path d="M6 53c16-6 32-6 52-12v4C38 51 22 52 6 58Z" fill="#1fbf74" />
        <path d="M6 58c16-6 32-6 52-12v5C38 57 22 57 6 63Z" fill="#e0263a" />
      </g>
    </svg>
  );
}
