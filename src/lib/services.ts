import type { PublicConfig } from './config';
import type { UserService } from './types';

export type Category = 'vpn' | 'proxy' | 'web_tariff' | 'web' | 'mysql' | 'mail' | 'hosting' | 'other';

const TITLES: Record<string, string> = {
  vpn: 'VPN',
  proxy: 'VPN-подписка',
  web_tariff: 'Хостинг',
  web: 'Сайты',
  mysql: 'Базы данных',
  mail: 'Почта',
  hosting: 'Хостинг',
  other: 'Другое',
};

export function normalizeCategory(category: string, cfg: PublicConfig['services']): Category {
  if (cfg.proxyCategories.includes(category)) return 'proxy';
  if (cfg.vpnCategories.includes(category)) return 'vpn';
  if (/remna|remnawave|marzban|marz|mz/i.test(category)) return 'proxy';
  if (/^(vpn|wg|awg)/i.test(category)) return 'vpn';
  if (['web_tariff', 'web', 'mysql', 'mail', 'hosting'].includes(category)) return category as Category;
  return 'other';
}

export function categoryTitle(cat: Category, cfg: PublicConfig['services']) {
  if (cat === 'vpn' && cfg.vpnTitle) return cfg.vpnTitle;
  if (cat === 'proxy' && cfg.proxyTitle) return cfg.proxyTitle;
  return TITLES[cat] ?? cat;
}

/** Плоский список SHM → дерево (дочерние услуги внутри родительских). */
export function buildTree(flat: UserService[]): UserService[] {
  const map = new Map<number, UserService>();
  flat.forEach((s) => map.set(s.user_service_id, { ...s, children: [] }));
  const roots: UserService[] = [];
  map.forEach((s) => {
    if (s.parent && map.has(s.parent)) map.get(s.parent)!.children!.push(s);
    else if (!s.parent) roots.push(s);
  });
  return roots;
}

export function someDeep(list: UserService[], pred: (s: UserService) => boolean): boolean {
  return list.some((s) => pred(s) || someDeep(s.children ?? [], pred));
}
