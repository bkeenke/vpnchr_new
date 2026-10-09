import type { Metadata } from 'next';
import { getUserServices } from '@/lib/shm';
import { buildTree } from '@/lib/services';
import { ServicesView } from '@/components/services/services-view';

export const metadata: Metadata = { title: 'Услуги' };

export default async function ServicesPage() {
  const services = buildTree(await getUserServices().catch(() => []));
  return <ServicesView services={services} />;
}
