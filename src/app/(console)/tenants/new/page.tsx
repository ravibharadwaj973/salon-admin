import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { apiFetchSafe } from '@/lib/api';
import { PageHeader } from '@/components/ui/display';
import { ProvisionForm } from './provision-form';
import type { Plan } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Onboard a salon' };

export default async function NewTenantPage() {
  const plans = await apiFetchSafe<Plan[]>('/platform/plans', { query: { activeOnly: 'true' } });

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/tenants" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        All salons
      </Link>

      <PageHeader
        title="Onboard a salon"
        description="Creates the tenant, its first branch, the owner's login and a starter catalogue — in one transaction."
      />

      <ProvisionForm plans={plans ?? []} />
    </div>
  );
}
