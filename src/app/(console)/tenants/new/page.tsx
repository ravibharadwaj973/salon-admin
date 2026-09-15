import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { apiFetchSafe } from '@/lib/api';
import { PageHeader } from '@/components/ui/display';
import { ProvisionForm } from './provision-form';
import type { Enquiry, Plan } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Onboard a salon' };

export default async function NewTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ enquiry?: string }>;
}) {
  const { enquiry: enquiryId } = await searchParams;

  const [plans, enquiry] = await Promise.all([
    apiFetchSafe<Plan[]>('/platform/plans', { query: { activeOnly: 'true' } }),
    enquiryId ? apiFetchSafe<Enquiry>(`/platform/enquiries/${enquiryId}`) : Promise.resolve(null),
  ]);

  // Only offer the enquiry as a source if it has not already become a salon —
  // otherwise "create from enquiry" would quietly make a second one.
  const from = enquiry && !enquiry.convertedTenantId ? enquiry : null;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={from ? `/enquiries/${from.id}` : '/tenants'}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        {from ? 'Back to the enquiry' : 'All salons'}
      </Link>

      <PageHeader
        title={from ? `Onboard ${from.salonName}` : 'Onboard a salon'}
        description={
          from
            ? `From ${from.contactName}'s enquiry. Creating the salon marks it won and links the two together.`
            : "Creates the tenant, its first branch, the owner's login and a starter catalogue — in one transaction."
        }
      />

      <ProvisionForm plans={plans ?? []} enquiry={from} />
    </div>
  );
}
