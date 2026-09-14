import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building2 } from 'lucide-react';
import { ApiError, apiFetch, apiFetchSafe } from '@/lib/api';
import { Badge, Card, CardBody, CardHeader, PageHeader, StatTile, StatusBadge } from '@/components/ui/display';
import { TenantActions } from './tenant-actions';
import { TenantUsage } from './tenant-usage';
import { count, date, money, phone as formatPhone } from '@/lib/format';
import { FAIR_USE_UNLIMITED } from '@/lib/types';
import type { CreditEntry, CreditPack, LimitsSummary, Plan, Tenant, UsageSummary } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const tenant = await apiFetch<Tenant>(`/platform/tenants/${(await params).id}`);
    return { title: tenant.name };
  } catch {
    return { title: 'Salon' };
  }
}

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let tenant: Tenant;
  try {
    tenant = await apiFetch<Tenant>(`/platform/tenants/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const [plans, packs, meterState, overview] = await Promise.all([
    apiFetchSafe<Plan[]>('/platform/plans'),
    apiFetchSafe<CreditPack[]>('/platform/packs', { query: { activeOnly: 'true' } }),
    apiFetchSafe<{ usage: UsageSummary; limits: LimitsSummary; history: CreditEntry[] }>(
      `/platform/tenants/${id}/usage`,
    ),
    apiFetchSafe<TenantOverview>(`/platform/tenants/${id}/overview`),
  ]);
  const subscription = tenant.subscriptions?.[0] ?? null;

  return (
    <>
      <Link href="/tenants" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        All salons
      </Link>

      <PageHeader
        title={tenant.name}
        description={`${tenant.slug} · joined ${date(tenant.createdAt)}`}
        action={<TenantActions tenantId={tenant.id} status={tenant.status} plans={plans ?? []} />}
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Status" value={tenant.status.replace(/_/g, ' ').toLowerCase()} />
        <StatTile label="Branches" value={String(tenant._count?.branches ?? 0)} />
        <StatTile label="Users" value={String(tenant._count?.users ?? 0)} />
        <StatTile label="Customers" value={count(tenant._count?.customers ?? 0)} />
        <StatTile label="Invoices" value={count(tenant._count?.invoices ?? 0)} />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Salon details" />
          <CardBody className="space-y-2.5">
            <Row label="Legal name" value={tenant.legalName} />
            <Row label="GSTIN" value={tenant.gstin} mono />
            <Row label="Phone" value={formatPhone(tenant.phone)} />
            <Row label="Email" value={tenant.email} />
            <Row label="City" value={[tenant.city, tenant.state].filter(Boolean).join(', ')} />
            <Row label="Currency" value={tenant.currency} />
            <Row label="Timezone" value={tenant.timezone} />
            <Row label="Booking page" value={`/book/${tenant.slug}`} mono />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Subscription" subtitle="Recorded after payment is collected off-platform" />
          <CardBody className="space-y-2.5">
            <Row label="Plan" value={tenant.plan?.name ?? 'No plan assigned'} />
            {tenant.trialEndsAt ? <Row label="Trial ends" value={date(tenant.trialEndsAt)} /> : null}
            {subscription ? (
              <>
                <Row label="Current period ends" value={date(subscription.currentPeriodEnd)} />
                <Row label="Amount recorded" value={money(subscription.amount)} />
                <Row label="Started" value={date(subscription.startedAt)} />
              </>
            ) : (
              <p className="pt-1 text-xs text-ink-muted">
                No active subscription recorded. Assign a plan once you have been paid.
              </p>
            )}

            <div className="!mt-4 flex items-center gap-2 rounded-lg bg-stone-50 p-3">
              <Building2 className="h-4 w-4 shrink-0 text-ink-subtle" />
              <p className="text-2xs leading-relaxed text-ink-muted">
                Switching a salon off takes effect immediately, and makes their account read-only rather than locking
                them out: every record stays readable and exportable, and nothing new can be saved — no bookings, no
                bills, no messages.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {overview ? (
        <Card className="mt-5">
          <CardHeader
            title="How they are using it"
            subtitle="Last 30 days. Aggregate only — no customer records are shown here."
          />
          <CardBody>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Figure label="Appointments" value={count(overview.activity.appointments30)} />
              <Figure label="Bills raised" value={count(overview.activity.invoices30)} />
              <Figure label="Revenue billed" value={money(overview.activity.revenue30)} />
              <Figure label="Active staff" value={count(overview.activity.staff)} />
            </div>

            <div className="mt-4 grid gap-2.5 border-t border-stone-100 pt-4 sm:grid-cols-3">
              <Row label="Last booking" value={overview.activity.lastAppointmentAt ? date(overview.activity.lastAppointmentAt) : 'never'} />
              <Row label="Last bill" value={overview.activity.lastInvoiceAt ? date(overview.activity.lastInvoiceAt) : 'never'} />
              <Row
                label="Last signed in"
                value={
                  overview.activity.lastLoginAt
                    ? `${date(overview.activity.lastLoginAt)}${overview.activity.lastLoginBy ? ` · ${overview.activity.lastLoginBy.name}` : ''}`
                    : 'never'
                }
              />
            </div>

            {overview.branches.length > 0 ? (
              <div className="mt-4 border-t border-stone-100 pt-4">
                <p className="mb-2 text-2xs font-medium uppercase tracking-wide text-ink-subtle">Branches</p>
                <ul className="space-y-1.5">
                  {overview.branches.map((branch) => (
                    <li key={branch.id} className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-ink">
                        {branch.name}
                        {branch.city ? <span className="text-ink-subtle"> · {branch.city}</span> : null}
                        {branch.isActive ? null : <span className="ml-1.5 text-ink-subtle">(closed)</span>}
                      </span>
                      <span className="tnum shrink-0 text-ink-muted">
                        {branch._count.staff} staff · {count(branch._count.appointments)} bookings
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      <TenantUsage
        tenantId={tenant.id}
        usage={meterState?.usage ?? null}
        limits={meterState?.limits ?? null}
        packs={packs ?? []}
        history={meterState?.history ?? []}
      />

      {plans && plans.length > 0 ? (
        <Card className="mt-5">
          <CardHeader title="Plans available" subtitle="What this salon could be moved onto" />
          <CardBody className="grid gap-3 sm:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-xl border p-4 ${
                  tenant.plan?.code === plan.code ? 'border-brand-300 bg-brand-50' : 'border-stone-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink">{plan.name}</p>
                  {tenant.plan?.code === plan.code ? <Badge tone="brand">Current</Badge> : null}
                </div>
                <p className="tnum mt-1 text-lg font-semibold text-ink">{money(plan.pricePerMonth)}<span className="text-xs font-normal text-ink-muted">/mo</span></p>
                <ul className="mt-2 space-y-0.5 text-2xs text-ink-muted">
                  <li>{plan.maxBranches} branches</li>
                  <li>{plan.maxStaff} staff</li>
                  <li>{plan.maxCustomers >= FAIR_USE_UNLIMITED ? 'Unlimited' : count(plan.maxCustomers)} customers</li>
                  <li>{count(plan.waUtilityQuota)} WhatsApp utility / month</li>
                  <li>
                    {plan.waMarketingQuota > 0
                      ? `${count(plan.waMarketingQuota)} WhatsApp marketing / month`
                      : 'No WhatsApp marketing'}
                  </li>
                  <li>
                    {plan.maxCampaignsPerMonth >= FAIR_USE_UNLIMITED
                      ? 'Unlimited campaigns'
                      : `${plan.maxCampaignsPerMonth} campaigns / month`}
                  </li>
                </ul>
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}
    </>
  );
}

function Row({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-2 last:border-b-0">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className={`text-right text-sm text-ink ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</span>
    </div>
  );
}

interface TenantOverview {
  branches: { id: string; name: string; city: string | null; isActive: boolean; _count: { staff: number; appointments: number } }[];
  activity: {
    staff: number;
    appointments30: number;
    invoices30: number;
    revenue30: number | string;
    lastAppointmentAt: string | null;
    lastInvoiceAt: string | null;
    lastLoginAt: string | null;
    lastLoginBy: { name: string; role: string } | null;
  };
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-stone-50 p-3">
      <p className="tnum text-lg font-semibold text-ink">{value}</p>
      <p className="text-2xs text-ink-muted">{label}</p>
    </div>
  );
}
