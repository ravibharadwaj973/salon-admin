import type { Metadata } from 'next';
import Link from 'next/link';
import { Building2, Plus, Search } from 'lucide-react';
import { apiFetchList } from '@/lib/api';
import { Badge, Card, EmptyState, PageHeader, StatusBadge } from '@/components/ui/display';
import { ButtonLink } from '@/components/ui/button';
import { Pagination, TBody, TD, TH, THead, TR, Table } from '@/components/ui/table';
import { count, date, phone as formatPhone } from '@/lib/format';
import type { Tenant, TenantStatus } from '@/lib/types';

export const metadata: Metadata = { title: 'Salons' };
export const dynamic = 'force-dynamic';

const STATUSES: TenantStatus[] = ['TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED'];

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);

  const { data: tenants, meta } = await apiFetchList<Tenant>('/platform/tenants', {
    query: { q: params.q, status: params.status, page, pageSize: 25 },
  });

  return (
    <>
      <PageHeader
        title="Salons"
        description={`${count(meta.total)} on the platform`}
        action={
          <ButtonLink href="/tenants/new">
            <Plus className="h-4 w-4" />
            New salon
          </ButtonLink>
        }
      />

      <Card>
        <form className="flex flex-wrap items-center gap-2 border-b border-stone-200 p-3" action="/tenants">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-subtle" />
            <input
              type="search"
              name="q"
              defaultValue={params.q ?? ''}
              placeholder="Name, slug, email or phone…"
              className="h-9 w-full rounded-lg border border-stone-300 bg-white pl-8 pr-3 text-sm shadow-sm"
            />
          </div>
          <select name="status" defaultValue={params.status ?? ''} className="h-9 rounded-lg border border-stone-300 bg-white px-3 text-sm shadow-sm">
            <option value="">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace(/_/g, ' ').toLowerCase()}
              </option>
            ))}
          </select>
          <button type="submit" className="h-9 rounded-lg bg-brand-600 px-3.5 text-sm font-medium text-white hover:bg-brand-700">
            Apply
          </button>
        </form>

        {tenants.length === 0 ? (
          <EmptyState icon={Building2} title="No salons match" description="Try a different search or status." />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Salon</TH>
                  <TH>Contact</TH>
                  <TH>Plan</TH>
                  <TH>Status</TH>
                  <TH align="right">Branches</TH>
                  <TH align="right">Users</TH>
                  <TH align="right">Customers</TH>
                  <TH>Joined</TH>
                </TR>
              </THead>
              <TBody>
                {tenants.map((tenant) => (
                  <TR key={tenant.id}>
                    <TD>
                      <Link href={`/tenants/${tenant.id}`} className="font-medium text-ink hover:text-brand-700">
                        {tenant.name}
                      </Link>
                      <p className="font-mono text-2xs text-ink-subtle">{tenant.slug}</p>
                    </TD>
                    <TD className="text-xs text-ink-muted">
                      {tenant.email}
                      <br />
                      <span className="tnum">{formatPhone(tenant.phone)}</span>
                    </TD>
                    <TD>{tenant.plan ? <Badge>{tenant.plan.name}</Badge> : <span className="text-ink-subtle">—</span>}</TD>
                    <TD>
                      <StatusBadge status={tenant.status} />
                    </TD>
                    <TD align="right" className="text-ink-muted">{tenant._count?.branches ?? 0}</TD>
                    <TD align="right" className="text-ink-muted">{tenant._count?.users ?? 0}</TD>
                    <TD align="right" className="text-ink-muted">{count(tenant._count?.customers ?? 0)}</TD>
                    <TD className="text-xs text-ink-subtle">{date(tenant.createdAt, 'DD MMM YY')}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <Pagination
              page={meta.page}
              pageSize={meta.pageSize}
              total={meta.total}
              basePath="/tenants"
              searchParams={params as Record<string, string | undefined>}
            />
          </>
        )}
      </Card>
    </>
  );
}
