export interface User {
  user_id: number;
  login: string;
  login2?: string;
  full_name?: string;
  phone?: string;
  balance: number;
  credit: number;
  discount: number;
  bonus: number;
  gid: number;
  telegram_user_id?: number;
}

export type ServiceStatus = 'ACTIVE' | 'NOT PAID' | 'BLOCK' | 'PROGRESS' | 'ERROR' | 'INIT' | string;

export interface UserService {
  user_service_id: number;
  service_id: number;
  name?: string;
  service: { category: string; cost: number; name: string };
  status: ServiceStatus;
  expire: string | null;
  next: number | null;
  created: string;
  parent: number | null;
  settings?: Record<string, unknown>;
  children?: UserService[];
}

export interface OrderService {
  service_id: number;
  name: string;
  category: string;
  cost: number;
  partial_renew?: boolean;
  real_cost: number;
  real_cost_with_bonuses: number;
  cost_discount: number;
  cost_bonus: number;
  discount: number;
  period: number;
  descr: string;
}

export interface PaySystem {
  name: string;
  shm_url: string;
  paysystem: string;
  allow_deletion?: number;
  recurring?: number;
  internal?: number;
  weight?: number;
}

export interface ForecastItem {
  name: string;
  cost: number;
  real_cost?: number;
  total: number;
  status: string;
  service_id?: string;
  user_service_id: string;
  months?: number;
  qnt?: number;
  discount?: number;
  expire?: string;
  next?: { name: string; cost: number; total: number; months: number; qnt: number };
}

export interface Forecast {
  balance: number;
  bonuses?: number;
  dept?: number;
  total: number;
  items?: ForecastItem[];
}

export interface Payment {
  id: number;
  date: string;
  money: number;
  pay_system_id?: string;
}

export interface Withdrawal {
  withdraw_id: number;
  user_service_id: number;
  service_id: number;
  cost: number;
  total: number;
  discount: number;
  bonus: number;
  months: number;
  qnt: number;
  create_date: string;
  withdraw_date: string;
  end_date: string;
}
