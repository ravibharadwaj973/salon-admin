import type { Metadata } from 'next';
import { apiFetchSafe } from '@/lib/api';
import { PageHeader } from '@/components/ui/display';
import { PacksManager } from './packs-manager';
import type { CreditPack } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Add-on packs' };

export default async function PacksPage() {
  const packs = await apiFetchSafe<CreditPack[]>('/platform/packs');

  return (
    <>
      <PageHeader
        title="Add-on packs"
        description="What a salon can buy when it runs past its monthly allowance. Purchased credits carry over; the plan allowance resets on the 1st."
      />
      <PacksManager initialPacks={packs ?? []} />
    </>
  );
}
