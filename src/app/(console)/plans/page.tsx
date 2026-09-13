import type { Metadata } from 'next';
import { apiFetchSafe } from '@/lib/api';
import { PageHeader } from '@/components/ui/display';
import { PlansManager } from './plans-manager';
import type { Plan } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Plans' };

type PlanWithCount = Plan & { _count?: { tenants: number } };

export default async function PlansPage() {
  const plans = await apiFetchSafe<PlanWithCount[]>('/platform/plans');

  return (
    <>
      <PageHeader
        title="Plans"
        description="What a salon may use. Limits are enforced by the API — a salon on a one-branch plan cannot create a second branch."
      />
      <PlansManager initialPlans={plans ?? []} />
    </>
  );
}
