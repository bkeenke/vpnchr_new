import { IconSearch, IconPower, IconChevronRight, IconHome, IconWorld, IconSettings, IconMenu2, IconArrowRight } from '@tabler/icons-react';
import { Wordmark } from '@/components/brand/logo';

const SERVERS = [
  ['🇷🇺', 'Россия', 'Москва'],
  ['🇷🇺', 'Россия', 'Санкт-Петербург'],
  ['🇹🇷', 'Турция', 'Стамбул'],
  ['🇦🇪', 'ОАЭ', 'Дубай'],
  ['🇩🇪', 'Германия', 'Франкфурт'],
  ['🇳🇱', 'Нидерланды', 'Амстердам'],
  ['🇺🇸', 'США', 'Нью-Йорк'],
];

function Frame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[2.6rem] bg-[linear-gradient(145deg,#e8edf0,#6f787e_45%,#d9dfe2)] p-[3px] shadow-[0_40px_80px_rgba(0,0,0,.6)] ${className}`}>
      <div className="relative h-full overflow-hidden rounded-[2.45rem] bg-[#050907] p-3 pt-2">
        <div className="mx-auto mb-2 h-6 w-24 rounded-full bg-black" />
        {children}
      </div>
    </div>
  );
}

/** Два телефона из макета, сверстанные в HTML (без картинок). */
export function PhonesMockup() {
  return (
    <div className="relative mx-auto h-[440px] w-full max-w-[460px] sm:h-[500px]" aria-hidden>
      {/* Экран списка серверов */}
      <Frame className="absolute top-10 left-0 h-[380px] w-[210px] -rotate-[4deg] opacity-90 sm:h-[430px] sm:w-[230px]">
        <div className="px-2 text-[11px]">
          <p className="mb-2 text-sm font-semibold">Серверы</p>
          <div className="text-muted mb-2 flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1.5">
            <IconSearch className="size-3" /> Поиск...
          </div>
          <div className="mb-2 grid grid-cols-2 rounded-lg bg-white/5 p-0.5 text-center text-[10px]">
            <span className="rounded-md bg-white/10 py-1">Все</span>
            <span className="text-muted py-1">Избранные</span>
          </div>
          {SERVERS.map(([flag, country, city]) => (
            <div key={city} className="flex items-center gap-2 border-b border-white/5 py-1.5">
              <span className="text-base leading-none">{flag}</span>
              <span>
                <span className="block leading-tight">{country}</span>
                <span className="text-muted block text-[9px]">{city}</span>
              </span>
            </div>
          ))}
        </div>
      </Frame>

      {/* Главный экран подключения */}
      <Frame className="absolute top-0 right-0 h-[420px] w-[230px] sm:h-[480px] sm:w-[250px]">
        <div className="flex h-[calc(100%-2rem)] flex-col px-2">
          <div className="flex items-center justify-between text-white/80">
            <IconMenu2 className="size-4" />
            <Wordmark className="text-base" />
            <IconArrowRight className="size-4" />
          </div>
          <div className="mt-8 grid place-items-center">
            <div className="grid size-32 place-items-center rounded-full bg-[radial-gradient(circle,rgba(34,229,140,.18),transparent_70%)]">
              <div className="neon-ring grid size-24 place-items-center rounded-full bg-[radial-gradient(circle_at_40%_30%,#1c2a24,#050907)] shadow-[0_0_40px_rgba(34,229,140,.5)]">
                <IconPower className="size-9 text-white" stroke={2.2} />
              </div>
            </div>
            <p className="text-green mt-4 text-sm font-semibold">Соединение установлено</p>
            <p className="text-muted mt-1 text-[10px]">• Ваш интернет под защитой</p>
          </div>
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5 text-[11px]">
            <span className="text-lg leading-none">🇷🇺</span>
            <span className="flex-1">
              <span className="block">Россия</span>
              <span className="text-muted block text-[9px]">Оптимальный сервер</span>
            </span>
            <IconChevronRight className="text-muted size-4" />
          </div>
          <div className="text-muted mt-auto grid grid-cols-3 border-t border-white/10 pt-2 text-center text-[9px]">
            <span className="text-green">
              <IconHome className="mx-auto size-4" />
              Главная
            </span>
            <span>
              <IconWorld className="mx-auto size-4" />
              Серверы
            </span>
            <span>
              <IconSettings className="mx-auto size-4" />
              Настройки
            </span>
          </div>
        </div>
      </Frame>
    </div>
  );
}
