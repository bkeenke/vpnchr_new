'use client';

import { Wordmark } from '@/components/brand/logo';
import { useConfig } from '@/components/providers/config';

const LEGAL_LABELS: Record<string, string> = {
  privacyPolicy: 'Политика конфиденциальности',
  termsOfUse: 'Условия использования',
  publicOffer: 'Договор оферты',
  userAgreement: 'Пользовательское соглашение',
  returnPolicy: 'Политика возврата',
};

export function SiteFooter() {
  const { legal, contactEmail, contactPhone, appName } = useConfig();
  return (
    <footer className="border-line bg-bg border-t">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-10">
        <div>
          <Wordmark className="text-xl" />
          <p className="text-muted mt-2 text-xs">
            © {new Date().getFullYear()} {appName}. Все права защищены.
          </p>
        </div>
        <div className="text-muted flex flex-col gap-2 text-sm md:items-end">
          {(contactEmail || contactPhone) && (
            <p className="flex flex-wrap gap-x-4">
              {contactEmail && (
                <a href={`mailto:${contactEmail}`} className="hover:text-green">
                  {contactEmail}
                </a>
              )}
              {contactPhone && (
                <a href={`tel:${contactPhone}`} className="hover:text-green">
                  {contactPhone}
                </a>
              )}
            </p>
          )}
          {legal.length > 0 && (
            <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Документы">
              {legal.map((l) => (
                <a key={l.key} href={l.href} target="_blank" rel="noreferrer" className="hover:text-green">
                  {LEGAL_LABELS[l.key] ?? l.key}
                </a>
              ))}
            </nav>
          )}
        </div>
      </div>
    </footer>
  );
}
