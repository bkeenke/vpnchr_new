import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getCurrentUser, getUserEmail } from '@/lib/shm';
import { CabinetHeader, BottomNav } from '@/components/cabinet/nav';
import { UserProvider } from '@/components/providers/user';
import { EmailGate } from '@/components/cabinet/email-gate';
import { TelegramWebAppBridge } from '@/components/cabinet/telegram-bridge';
import { SupportWidgets } from '@/components/cabinet/support-widgets';
import sectionImage from '../../../public/images/section-dark.webp';

export default async function CabinetLayout({ children }: { children: React.ReactNode }) {
  const [user, email] = await Promise.all([getCurrentUser(), getUserEmail()]);
  if (!user) redirect('/login');

  return (
    <UserProvider user={user} email={email}>
      <div className="relative isolate min-h-svh pb-24 lg:pb-12">
        <Image src={sectionImage} alt="" fill sizes="100vw" className="-z-20 object-cover object-top opacity-60" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(5,8,7,.4),#050807_420px)]" />
        <CabinetHeader />
        <main className="mx-auto max-w-5xl px-4 pt-24 sm:px-6 lg:pt-28">{children}</main>
        <BottomNav />
      </div>
      <EmailGate />
      <TelegramWebAppBridge />
      <SupportWidgets />
    </UserProvider>
  );
}
