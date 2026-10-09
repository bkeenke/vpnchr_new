// Мок SHM API для локальной разработки: node scripts/mock-shm.mjs  (порт 8081)
// Логин: demo / demo123. Данные в памяти, сбрасываются при перезапуске.
import http from 'node:http';

const SESSION = 'mock-session-1';
let balance = 150;
let email = { email: 'demo@vpnchr.test', email_verified: 0 };
let nextId = 1003;
const services = [
  { user_service_id: 1001, service_id: 1, parent: null, status: 'ACTIVE', expire: '2026-10-24 12:00:00', next: null, created: '2026-09-01', service: { category: 'vpn-remna', cost: 200, name: 'VPN · 1 месяц' } },
  { user_service_id: 1002, service_id: 2, parent: null, status: 'NOT PAID', expire: null, next: null, created: '2026-09-20', service: { category: 'vpn-remna', cost: 300, name: 'Антиглушилка' } },
];
const catalog = [
  { service_id: 1, name: '1 месяц', category: 'vpn-remna', cost: 200, real_cost: 200, real_cost_with_bonuses: 200, period: 1, descr: 'Безлимитный VPN на все устройства' },
  { service_id: 2, name: 'Антиглушилка', category: 'vpn-remna', cost: 300, real_cost: 270, real_cost_with_bonuses: 270, period: 1, descr: 'Работает там, где режут трафик' },
  { service_id: 3, name: '3 месяца', category: 'vpn-remna', cost: 540, real_cost: 540, real_cost_with_bonuses: 540, period: 3, descr: 'Выгоднее на 10%' },
];

const json = (res, code, body, headers = {}) => {
  res.writeHead(code, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
};

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname.replace(/^\/shm\/v1/, '');
    let body = '';
    for await (const c of req) body += c;
    const data = body ? JSON.parse(body) : {};
    const authed = req.headers['session_id'] === SESSION;
    console.log(req.method, p, authed ? '(auth)' : '');

    if (p === '/user/auth' && req.method === 'POST') {
      if (data.login === 'demo' && data.password === 'demo123') return json(res, 200, { id: SESSION });
      return json(res, 401, { error: 'Incorrect login or password' });
    }
    if (p === '/user' && req.method === 'PUT') return json(res, 200, { data: [{ user_id: 2 }] });
    if (p === '/public/get_config') {
      if (url.searchParams.get('key') !== 'remna') return json(res, 200, {});
      return json(res, 200, {
        APP_NAME: 'VPNCHR', SUPPORT_LINK: 'https://t.me/vpnchr_support', PROXY_CATEGORY_TITLE: 'VPN',
        PROXY_APP_IOS_URL: 'https://apps.apple.com/app/happ', PROXY_APP_ANDROID_URL: 'https://play.google.com/store/apps/details?id=happ',
        PROXY_APP_WINDOWS_URL: 'https://happ.su/win', IOS_PROXY_URL_SCHEMA: 'happ://add/', OTP_ENABLE: true, PASSKEY_ENABLE: 'true',
      });
    }
    if (p === '/public/price_list')
      return json(res, 200, catalog.map((c) => ({ id: c.service_id, name: c.name, cost: c.cost, real_cost: c.real_cost < c.cost ? c.real_cost : '', discount: '', period: c.period, is_popular: c.service_id === 3 ? 1 : '', descr: `${c.descr}\\n\n250GB в месяц\\n\n` })));
    if (p === '/user/captcha') return json(res, 200, { data: [{ question: '2 + 3 = ?', token: 't' }] });
    if (p === '/service/order' && !authed) return json(res, 401, { error: 'unauthorized' });
    if (!authed) return json(res, 401, { error: 'unauthorized' });

    switch (`${req.method} ${p}`) {
      case 'GET /user':
        return json(res, 200, { data: [{ user_id: 1, login: 'demo', full_name: 'Демо Пользователь', phone: '', balance, credit: 0, discount: 10, bonus: 25, gid: 0 }] });
      case 'POST /user':
        return json(res, 200, { data: [{}] });
      case 'GET /user/email':
        return json(res, 200, { data: [email] });
      case 'PUT /user/email':
        email = { email: data.email, email_verified: 0 };
        return json(res, 200, { data: [{ msg: 'Successful' }] });
      case 'POST /user/email':
        if (data.code) {
          email.email_verified = 1;
          return json(res, 200, { data: [{ msg: 'Email verified successfully' }] });
        }
        return json(res, 200, { data: [{ msg: 'Verification code sent' }] });
      case 'GET /user/service':
        return json(res, 200, { data: services, items: services.length });
      case 'GET /service/order':
        return json(res, 200, { data: catalog });
      case 'PUT /service/order': {
        const s = catalog.find((c) => c.service_id === data.service_id);
        const paid = balance >= s.cost;
        if (paid) balance -= s.cost;
        services.push({ user_service_id: nextId++, service_id: s.service_id, parent: null, status: paid ? 'PROGRESS' : 'NOT PAID', expire: null, next: null, created: '2026-09-24', service: { category: s.category, cost: s.cost, name: s.name } });
        setTimeout(() => services.forEach((x) => x.status === 'PROGRESS' && (x.status = 'ACTIVE', x.expire = '2026-10-24 12:00:00')), 1500);
        return json(res, 200, { data: [{}] });
      }
      case 'POST /user/service/stop':
        services.find((s) => s.user_service_id === data.user_service_id).status = 'BLOCK';
        return json(res, 200, { data: [{}] });
      case 'DELETE /user/service': {
        const i = services.findIndex((s) => s.user_service_id === Number(url.searchParams.get('user_service_id')));
        services.splice(i, 1);
        return json(res, 200, { data: [{}] });
      }
      case 'GET /user/pay/paysystems':
        return json(res, 200, { data: [{ name: 'СБП', paysystem: 'sbp', shm_url: 'http://127.0.0.1:8081/shm/v1/public/pay?amount=', weight: 10 }, { name: 'С баланса карты', paysystem: 'card', shm_url: '/shm/v1/public/card?amount=', recurring: 1, allow_deletion: 1 }] });
      case 'GET /user/pay/forecast':
        return json(res, 200, { data: [{ balance, total: 150, dept: 0, items: [{ name: 'Антиглушилка', total: 300, cost: 300, status: 'NOT PAID', user_service_id: '1002', months: 1, qnt: 1 }] }] });
      case 'GET /user/pay':
        return json(res, 200, { data: Array.from({ length: 10 }, (_, i) => ({ id: i + 1, date: `2026-09-${String(20 - i).padStart(2, '0')} 10:00:00`, money: 200 + i * 10, pay_system_id: i % 2 ? 'sbp' : 'card' })), items: 23 });
      case 'GET /user/withdraw':
        return json(res, 200, { data: [{ withdraw_id: 1, user_service_id: 1001, service_id: 1, cost: 200, total: 180, discount: 10, bonus: 0, months: 1, qnt: 1, create_date: '2026-09-01', withdraw_date: '2026-09-01', end_date: '2026-10-01' }], items: 1 });
      case 'GET /user/referrals':
        return json(res, 200, { data: [{ total: 3 }] });
      case 'GET /public/card':
        balance += Number(url.searchParams.get('amount'));
        return json(res, 200, {});
      case 'GET /user/otp':
        return json(res, 200, { data: [{ enabled: false, verified: false, required: false }] });
      case 'POST /user/otp/setup':
        return json(res, 200, { data: [{ qr_url: 'otpauth://totp/VPNCHR:demo?secret=JBSWY3DPEHPK3PXP&issuer=VPNCHR', secret: 'JBSWY3DPEHPK3PXP', backup_codes: ['1111-2222', '3333-4444', '5555-6666', '7777-8888'] }] });
      case 'GET /user/passkey':
        return json(res, 200, { data: [{ credentials: [], enabled: false }] });
      case 'GET /user/password-auth':
        return json(res, 200, { data: [{ password_auth_disabled: 0, passkey_enabled: 0, otp_enabled: 0 }] });
    }
    if (p.startsWith('/storage/manage/vpn_mrzb_')) return json(res, 404, { error: 'not found' });
    if (p.startsWith('/storage/manage/vpn_remna_')) return json(res, 200, { subscription_url: 'https://sub.vpnchr.test/s/AbCdEf123456' });
    json(res, 404, { error: `mock: ${req.method} ${p}` });
  })
  .listen(8081, () => console.log('mock SHM on :8081'));
