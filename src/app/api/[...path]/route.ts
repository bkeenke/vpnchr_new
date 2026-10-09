import { NextRequest } from 'next/server';
import { proxyToShm } from '@/lib/shm-proxy';

/** Клиентский API: /api/user → SHM /shm/v1/user. */
async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxyToShm(req, `v1/${path.join('/')}`);
}

export { handle as GET, handle as POST, handle as PUT, handle as DELETE, handle as PATCH };
