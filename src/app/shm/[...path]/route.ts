import { NextRequest, NextResponse } from 'next/server';
import { proxyToShm } from '@/lib/shm-proxy';

/**
 * Только адреса возврата OAuth/OIDC: SHM строит их как {наш хост}/shm/v1/…/callback,
 * и они прописаны у провайдеров (Telegram). Весь остальной API — через /api.
 */
const CALLBACKS = [/^v1\/telegram\/web\/callback$/, /^v1\/oauth2\/callback\/[\w-]+$/];

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const subpath = (await ctx.params).path.join('/');
  if (!CALLBACKS.some((re) => re.test(subpath))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return proxyToShm(req, subpath);
}

export { handle as GET, handle as POST };
