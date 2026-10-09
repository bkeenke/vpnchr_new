import type { Metadata } from 'next';
import { getCurrentUser, getForecast, getReferralsCount, getTelegramUsername } from '@/lib/shm';
import { getPublicConfig } from '@/lib/config';
import { ProfileView } from '@/components/profile/profile-view';

export const metadata: Metadata = { title: 'Профиль' };

export default async function ProfilePage() {
  const cfg = await getPublicConfig();
  const showTelegram = cfg.telegram.allowPin || cfg.telegram.oidcAuth;
  const [user, forecast, referrals, telegram] = await Promise.all([
    getCurrentUser(),
    getForecast().catch(() => null),
    getReferralsCount(),
    showTelegram ? getTelegramUsername() : Promise.resolve(null),
  ]);
  // user гарантирован layout'ом кабинета
  return <ProfileView user={user!} forecast={forecast} referrals={referrals} telegramUsername={telegram} showTelegram={showTelegram} />;
}
