import type { Metadata } from 'next';
import Link from 'next/link';
import { Building2, Plus, Users } from 'lucide-react';
import { apiFetchList, apiFetchSafe } from '@/lib/api';
import { Badge, Card, CardHeader, EmptyState, PageHeader, StatTile, StatusBadge } from '@/components/ui/display';
import { ButtonLink } from '@/components/ui/button';
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table';
import { count, date, fromNow, money } from '@/lib/format';
import type { PlatformStats, Tenant } from '@/lib/types';

export const metadata: Metadata = { title: 'Overview' };
export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  const [stats, recent] = await Promise.all([
    apiFetchSafe<PlatformStats>('/platform/stats'),
    apiFetchList<Tenant>('/platform/tenants', { query: { pageSize: 8 } }).catch(() => null),
  ]);

  const byStatus = stats?.tenantsByStatus ?? {};

  return (
    <>
      <PageHeader
        title="Overview"
        description="Every salon on the platform"
        action={
          <ButtonLink href="/tenants/new">
            <Plus className="h-4 w-4" />
            New salon
          </ButtonLink>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Salons" value={count(stats?.tenants ?? 0)} hint={`${byStatus.ACTIVE ?? 0} active`} />
        <StatTile label="Branches" value={count(stats?.branches ?? 0)} />
        <StatTile label="Customers" value={count(stats?.customers ?? 0)} hint="across all salons" />
        <StatTile
          label="Gross transaction value"
          value={money(stats?.grossTransactionValue)}
          hint="billed through the platform"
        />
      </section>

      <section className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {(['TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED'] as const).map((status) => (
          <div key={status} className="rounded-xl border border-stone-200 bg-white p-3 shadow-card">
            <div className="flex items-center justify-between">
              <StatusBadge status={status} />
              <span className="tnum text-lg font-semibold text-ink">{byStatus[status] ?? 0}</span>
            </div>
          </div>
        ))}
      </section>

      <Card className="mt-5">
        <CardHeader
          title="Recently added salons"
          action={
            <Link href="/tenants" className="text-xs font-medium text-brand-700 hover:underline">
              All salons
            </Link>
          }
        />
        {!recent || recent.data.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No salons yet"
            description="Provision the first one — it takes a name, a phone number and an owner email."
            action={
              <ButtonLink href="/tenants/new" size="sm">
                <Plus className="h-3.5 w-3.5" />
                New salon
              </ButtonLink>
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Salon</TH>
                <TH>Plan</TH>
                <TH>Status</TH>
                <TH align="right">Branches</TH>
                <TH align="right">Customers</TH>
                <TH>Added</TH>
              </TR>
            </THead>
            <TBody>
              {recent.data.map((tenant) => (
                <TR key={tenant.id}>
                  <TD>
                    <Link href={`/tenants/${tenant.id}`} className="font-medium text-ink hover:text-brand-700">
                      {tenant.name}
                    </Link>
                    <p className="font-mono text-2xs text-ink-subtle">{tenant.slug}</p>
                  </TD>
                  <TD>{tenant.plan ? <Badge>{tenant.plan.name}</Badge> : <span className="text-ink-subtle">—</span>}</TD>
                  <TD>
                    <StatusBadge status={tenant.status} />
                  </TD>
                  <TD align="right" className="text-ink-muted">
                    {tenant._count?.branches ?? 0}
                  </TD>
                  <TD align="right" className="text-ink-muted">
                    {count(tenant._count?.customers ?? 0)}
                  </TD>
                  <TD className="text-xs text-ink-subtle">{fromNow(tenant.createdAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-ink-subtle">
        <Users className="h-3.5 w-3.5" />
        Subscription payments are collected off-platform and recorded by hand — there is no gateway here either.
      </p>
    </>
  );
}
