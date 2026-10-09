import 'server-only';
import { getServerConfig } from './config';
import { cachedLoader } from './remote';

export type PricePlan = {
  id: number;
  name: string;
  /** Цена к оплате. */
  cost: number;
  /** Цена до скидки, если есть скидка. */
  oldCost?: number;
  /** Период в месяцах. */
  period: number;
  features: string[];
  popular: boolean;
};

type RawPlan = {
  id: number;
  name: string;
  cost: number | string;
  real_cost?: number | string;
  discount?: number | string;
  period: number | string;
  descr?: string;
  is_popular?: number | string | boolean;
};

const num = (v: unknown) => (v === '' || v === null || v === undefined ? NaN : Number(v));

/** В descr SHM встречаются и буквальные «\n», и настоящие переводы строк. */
function features(descr = '') {
  return descr
    .replace(/\\n/g, '\n')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalize(p: RawPlan): PricePlan {
  const cost = num(p.cost) || 0;
  const real = num(p.real_cost);
  const hasDiscount = !Number.isNaN(real) && real > 0 && real < cost;
  return {
    id: Number(p.id),
    name: p.name,
    cost: hasDiscount ? real : cost,
    oldCost: hasDiscount ? cost : undefined,
    period: num(p.period) || 0,
    features: features(p.descr),
    popular: p.is_popular === true || Number(p.is_popular) === 1,
  };
}

async function fetchPriceList(): Promise<PricePlan[]> {
  const { shmUrl } = getServerConfig();
  const res = await fetch(`${shmUrl}/shm/v1/public/price_list`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`price_list ${res.status}`);
  const body = await res.json();
  const list: RawPlan[] = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
  return list.map(normalize);
}

/** Публичный прайс SHM (GET /shm/v1/public/price_list), в том же порядке, что в SHM. */
export const getPriceList = cachedLoader('price_list', fetchPriceList, [], () => getServerConfig().ttlMs);
