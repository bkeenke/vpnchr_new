import Image from 'next/image';
import Link from 'next/link';
import { IconArrowRight, IconCheck, IconBrandVk, IconBrandYoutubeFilled, IconDots, IconInfinity } from '@tabler/icons-react';
import { getCurrentUser } from '@/lib/shm';
import { cn, formatMoney, formatPeriod, monthlyCost } from '@/lib/utils';
import { getPriceList, type PricePlan } from '@/lib/price-list';
import { FEATURES, NeonCircle, PLATFORM_ICONS } from '@/components/brand/icons';
import { buttonVariants } from '@/components/ui/button';
import { SiteHeader } from '@/components/site/header';
import { SiteFooter } from '@/components/site/footer';
import { PhonesMockup } from '@/components/site/phones';
import heroImage from '../../public/images/hero-mobile.webp';
import sectionImage from '../../public/images/section-dark.webp';

const PARTNERS = [
  { name: 'Сбербанк', mark: <span className="grid size-6 place-items-center rounded-full bg-[#21a038] text-[11px] font-black text-white">С</span> },
  { name: 'Т-Банк', mark: <span className="grid size-6 place-items-center rounded-md bg-[#ffdd2d] text-[11px] font-black text-black">Т</span> },
  { name: 'Яндекс', mark: <span className="grid size-6 place-items-center rounded-md bg-[#fc3f1d] text-[13px] font-black text-white">Я</span> },
  { name: 'ВКонтакте', mark: <IconBrandVk className="size-6 rounded-md bg-[#0077ff] p-0.5 text-white" /> },
  { name: 'YouTube', mark: <IconBrandYoutubeFilled className="size-6 text-[#ff0000]" /> },
  { name: 'Rutube', mark: <span className="grid size-6 place-items-center rounded-md bg-[#100943] text-[11px] font-black text-white">R</span> },
];

const STEPS = ['Скачай приложение', 'Выбери сервер', 'Подключись'];

export default async function HomePage() {
  const [user, plans] = await Promise.all([getCurrentUser(), getPriceList()]);
  const ctaHref = user ? '/services' : '/login?register';
  // Выбранный тариф откроется в окне заказа сразу после входа
  const buyHref = (id: number) => (user ? `/services?order=${id}` : `/login?register&next=${encodeURIComponent(`/services?order=${id}`)}`);

  return (
    <>
      <SiteHeader authenticated={!!user} />

      <main>
        {/* ───────── HERO ───────── */}
        <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden pt-24 pb-10 lg:min-h-[860px]">
          <Image
            src={heroImage}
            alt=""
            fill
            priority
            placeholder="blur"
            sizes="100vw"
            className="-z-20 object-cover object-[49%_center] lg:object-[center_65%]"
          />
          {/* затемнения для читаемости текста */}
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(5,8,7,.55)_0%,rgba(5,8,7,.05)_30%,rgba(5,8,7,.1)_60%,rgba(5,8,7,.95)_100%)]" />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,8,7,.8)_0%,rgba(5,8,7,.3)_45%,transparent_70%)]" />

          <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 sm:px-6 lg:px-10">
            <p className="border-green ml-auto hidden border-r-2 pr-3 text-right text-xs leading-snug font-medium tracking-wider text-white/85 uppercase sm:block">
              Чеченские
              <br />
              технологии
              <br />
              для свободных
              <br />
              людей
            </p>

            <ul
              id="features"
              className="animate-rise mx-auto mt-4 grid w-full max-w-3xl scroll-mt-28 grid-cols-4 gap-2 [animation-delay:.1s] sm:mt-10 sm:gap-6"
            >
              {FEATURES.map(({ icon: Icon, label }) => (
                <li key={label[1]} className="flex flex-col items-center gap-3 text-center">
                  <NeonCircle>
                    <Icon className="size-6 sm:size-7" stroke={1.6} />
                  </NeonCircle>
                  <span className="text-[10px] leading-tight font-semibold text-white uppercase sm:text-xs">
                    {label[0]}
                    <br />
                    {label[1]}
                  </span>
                </li>
              ))}
            </ul>

            <div className="animate-rise mt-auto max-w-md pt-16 [animation-delay:.2s] lg:pt-10">
              <h2 className="font-display text-4xl leading-[1.05] font-bold text-white uppercase drop-shadow-lg sm:text-5xl">
                Интернет
                <br />
                без границ
              </h2>
              <p className="mt-4 text-base text-white/90 drop-shadow sm:text-lg">Быстрый и надёжный VPN. Работает со всеми российскими сервисами и банками.</p>
              <Link href={ctaHref} className={cn(buttonVariants({ size: 'lg' }), 'mt-7 h-16 w-full rounded-full sm:w-auto sm:px-9')}>
                Подключиться к VPNCHR <IconArrowRight className="size-6" />
              </Link>
              <ul className="mt-6 flex flex-wrap gap-x-7 gap-y-3 text-sm text-white/90">
                {(['ios', 'android', 'windows', 'macos'] as const).map((p) => {
                  const { icon: Icon, label } = PLATFORM_ICONS[p];
                  return (
                    <li key={p} className="flex items-center gap-2">
                      <Icon className="size-5" /> {label}
                    </li>
                  );
                })}
              </ul>
            </div>

            <p className="font-script pointer-events-none absolute right-6 bottom-4 hidden -rotate-6 text-3xl text-white/90 drop-shadow md:block lg:right-24 lg:text-4xl">
              Свобода
              <br />
              <span className="ml-8">объединяет</span>
              <span className="bg-green mt-1 ml-6 block h-0.5 w-28 rotate-[-4deg] rounded shadow-[0_0_10px_#22e58c]" />
            </p>
          </div>
        </section>

        {/* ───────── РАБОТАЕТ С ───────── */}
        <section className="border-line border-y bg-[#070b0a]" aria-label="Совместимые сервисы">
          <div className="mx-auto flex max-w-7xl [scrollbar-width:none] items-center gap-3 overflow-x-auto px-4 py-5 sm:px-6 lg:px-10">
            <span className="text-muted shrink-0 pr-2 text-sm">Работает с:</span>
            {PARTNERS.map((p) => (
              <span key={p.name} className="glass flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold">
                {p.mark}
                {p.name}
              </span>
            ))}
            <span className="glass text-muted flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm">
              <IconDots className="border-line size-5 rounded-full border p-0.5" /> и другими
            </span>
          </div>
        </section>

        {/* ───────── ОДИН КЛИК + ТАРИФЫ ───────── */}
        <section id="how" className="relative isolate scroll-mt-20 overflow-hidden py-16 lg:py-24">
          <Image src={sectionImage} alt="" fill sizes="100vw" className="-z-20 object-cover opacity-50" />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#050807_0%,rgba(5,8,7,.75)_45%,rgba(5,8,7,.55)_100%)]" />

          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:px-10">
            <PhonesMockup />

            <div>
              <p className="text-green text-sm font-semibold tracking-[0.2em] uppercase">Простое подключение</p>
              <h2 className="font-display mt-3 text-4xl leading-tight font-bold uppercase sm:text-5xl">
                Один клик —
                <br />и ты онлайн
              </h2>
              <p className="mt-4 max-w-md text-white/80">Установи приложение, выбери сервер и пользуйся интернетом без ограничений.</p>

              <div className="relative mt-8 flex flex-wrap items-center justify-between gap-6">
                <ol className="space-y-4">
                  {STEPS.map((s, i) => (
                    <li key={s} className="flex items-center gap-4">
                      <span className="neon-ring grid size-8 place-items-center rounded-full text-sm font-bold">{i + 1}</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
                <p className="font-script -rotate-6 text-3xl leading-tight text-white/85 sm:text-4xl">
                  Больше
                  <br />
                  <span className="ml-6">возможностей</span>
                  <br />
                  <span className="ml-14">каждый день</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ───────── ТАРИФЫ (GET /shm/v1/public/price_list) ───────── */}
        {plans.length > 0 && (
          <section
            id="plans"
            className="border-line scroll-mt-20 border-t bg-[radial-gradient(ellipse_at_top,rgba(34,229,140,.08),transparent_60%)] py-16 lg:py-24"
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
              <h2 className="font-display flex flex-wrap items-baseline gap-x-4 gap-y-1 text-3xl font-bold uppercase sm:text-4xl">
                Тарифы <span className="text-green font-sans text-xs font-semibold tracking-[0.25em]">выбери свою свободу</span>
              </h2>
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {plans.map((p) => (
                  <PlanCard key={p.id} plan={p} href={buyHref(p.id)} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ───────── ЦИФРЫ ───────── */}
        <section className="border-line border-t bg-[#060a09]">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-y-6 px-4 py-8 sm:px-6 lg:px-10">
            {[
              ['99.9%', 'Аптайм'],
              ['100+', 'Серверов'],
              [<IconInfinity key="i" className="size-9" />, 'Стабильная работа'],
            ].map(([value, label], i) => (
              <div key={i} className="w-1/2 border-l border-white/20 pl-6 sm:w-auto sm:pr-16">
                <p className="font-display text-2xl font-medium">{value}</p>
                <p className="text-muted mt-1 text-xs tracking-wider uppercase">{label}</p>
              </div>
            ))}
            <p className="w-full text-right text-sm leading-relaxed tracking-[0.3em] uppercase sm:ml-auto sm:w-auto">
              VPNCHR
              <br />
              <span className="text-muted text-xs">больше чем VPN</span>
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function PlanCard({ plan: p, href }: { plan: PricePlan; href: string }) {
  const perMonth = monthlyCost(p.cost, p.period);
  return (
    <article
      className={cn('relative flex flex-col rounded-2xl p-6 transition hover:-translate-y-0.5', p.popular ? 'glass-green' : 'glass hover:border-line-green')}
    >
      {p.popular && (
        <span className="bg-green absolute -top-3 right-5 rounded-full px-3 py-1 text-[11px] font-bold text-[#03140c] uppercase shadow-[0_0_16px_rgba(34,229,140,.6)]">
          Выгодно
        </span>
      )}
      <h3 className="font-semibold uppercase">{p.name}</h3>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold">{formatMoney(p.cost)}</span>
            {p.oldCost && <span className="text-muted line-through">{formatMoney(p.oldCost)}</span>}
          </p>
          <p className="text-muted mt-1 text-xs">за {formatPeriod(p.period)}</p>
        </div>
        {perMonth && (
          <p className="text-right">
            <span className="text-muted block text-xs">1 мес</span>
            <span className="text-green font-semibold whitespace-nowrap">{formatMoney(perMonth)}</span>
          </p>
        )}
      </div>
      {p.features.length > 0 && (
        <ul className="mt-5 space-y-2 text-sm text-white/85">
          {p.features.map((f) => (
            <li key={f} className="flex gap-2">
              <IconCheck className="text-green mt-0.5 size-4 shrink-0" /> {f}
            </li>
          ))}
        </ul>
      )}
      <div className="flex-1" />
      <Link href={href} className={cn(buttonVariants({ variant: p.popular ? 'neon' : 'ghost', block: true }), 'mt-6 rounded-xl')}>
        Выбрать <IconArrowRight className="size-4" />
      </Link>
    </article>
  );
}
