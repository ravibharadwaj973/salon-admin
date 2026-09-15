import type { Metadata } from 'next';
import Link from 'next/link';
import { Inbox, Phone, Search } from 'lucide-react';
import { apiFetchSafe } from '@/lib/api';
import { Card, EmptyState, PageHeader, StatTile } from '@/components/ui/display';
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table';
import { StageBadge } from './stage-badge';
import { cn } from '@/lib/cn';
import { date, fromNow, phone as formatPhone } from '@/lib/format';
import { ENQUIRY_STAGES } from '@/lib/types';
import type { Enquiry, EnquiryList, EnquiryStatus } from '@/lib/types';

export const metadata: Metadata = { title: 'Enquiries' };
export const dynamic = 'force-dynamic';

/**
 * ENQUIRIES — salons that asked to hear from you.
 *
 * The marketing site takes a name and a number and stops. Nobody signs
 * themselves up, so every salon on the platform has been spoken to first. This
 * page is the other half of that decision: the list you work through with the
 * phone in your hand.
 *
 * Read it top to bottom. Newest first, because the enquiry that came in this
 * morning is the one still deciding, and the one that has been sitting here
 * three days has already rung somebody else.
 */
export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status = ENQUIRY_STAGES.some((stage) => stage.status === params.status)
    ? (params.status as EnquiryStatus)
    : undefined;

  const data = await apiFetchSafe<EnquiryList>('/platform/enquiries', {
    query: { status, q: params.q, pageSize: 100 },
  });

  const items = data?.items ?? [];
  const counts = data?.counts ?? {};
  const total = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);

  const open = (counts.NEW ?? 0) + (counts.CONTACTED ?? 0) + (counts.DEMO_BOOKED ?? 0) + (counts.TRIAL_STARTED ?? 0);
  const waiting = items.filter((row) => row.status === 'NEW');
  const oldestWaiting = waiting.length > 0 ? waiting[waiting.length - 1] : null;

  return (
    <>
      <PageHeader
        title="Enquiries"
        description="Salons that asked you to get in touch. Nobody signs themselves up — this is where every customer starts."
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Waiting for a call"
          value={String(counts.NEW ?? 0)}
          tone={(counts.NEW ?? 0) > 0 ? 'negative' : 'neutral'}
          hint={oldestWaiting ? `oldest ${fromNow(oldestWaiting.createdAt)}` : 'all answered'}
        />
        <StatTile label="In conversation" value={String(open)} hint="not won or lost yet" />
        <StatTile label="Won" value={String(counts.WON ?? 0)} tone={(counts.WON ?? 0) > 0 ? 'positive' : 'neutral'} />
        <StatTile label="Lost" value={String(counts.LOST ?? 0)} hint={`${total} enquiries in all`} />
      </section>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 p-3">
          <nav className="flex flex-wrap gap-1">
            <Tab href={{ q: params.q }} active={!status} label="All" count={total} />
            {ENQUIRY_STAGES.map((stage) => (
              <Tab
                key={stage.status}
                href={{ status: stage.status, q: params.q }}
                active={status === stage.status}
                label={stage.label}
                count={counts[stage.status] ?? 0}
              />
            ))}
          </nav>

          <form className="relative ml-auto min-w-[200px]" action="/enquiries">
            {status ? <input type="hidden" name="status" value={status} /> : null}
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-subtle" />
            <input
              type="search"
              name="q"
              defaultValue={params.q ?? ''}
              placeholder="Salon, name, phone or city…"
              className="h-9 w-full rounded-lg border border-stone-300 bg-white pl-8 pr-3 text-sm shadow-sm"
            />
          </form>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={params.q ? 'Nothing matches that' : status ? 'Nothing at this stage' : 'No enquiries yet'}
            description={
              params.q || status
                ? 'Try another stage, or clear the search.'
                : 'When someone fills in the form on the website, they land here and you get an email.'
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Salon</TH>
                <TH>Who to ring</TH>
                <TH>City</TH>
                <TH>Size</TH>
                <TH>Came in</TH>
                <TH>Stage</TH>
              </TR>
            </THead>
            <TBody>
              {items.map((row) => (
                <TR key={row.id}>
                  <TD>
                    <Link href={`/enquiries/${row.id}`} className="font-medium text-ink hover:text-brand-700">
                      {row.salonName}
                    </Link>
                    {row.message ? (
                      <p className="mt-0.5 max-w-xs truncate text-2xs text-ink-subtle">{row.message}</p>
                    ) : null}
                  </TD>
                  <TD>
                    <p className="text-ink">{row.contactName}</p>
                    <a
                      href={`tel:${row.phone}`}
                      className="tnum mt-0.5 inline-flex items-center gap-1 text-2xs text-ink-muted hover:text-brand-700"
                    >
                      <Phone className="h-3 w-3" />
                      {formatPhone(row.phone)}
                    </a>
                  </TD>
                  <TD className="text-ink-muted">{row.city ?? '—'}</TD>
                  <TD className="text-ink-muted">{row.size ?? '—'}</TD>
                  <TD>
                    <span className={cn('text-ink-muted', isStale(row) && 'font-medium text-rose-700')}>
                      {fromNow(row.createdAt)}
                    </span>
                    <p className="text-2xs text-ink-subtle">{date(row.createdAt)}</p>
                  </TD>
                  <TD>
                    <StageBadge status={row.status} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}

/** Unanswered for more than a working day. Worth showing in red. */
function isStale(enquiry: Enquiry): boolean {
  return enquiry.status === 'NEW' && Date.now() - new Date(enquiry.createdAt).getTime() > 24 * 60 * 60 * 1000;
}

function Tab({
  href,
  active,
  label,
  count,
}: {
  href: { status?: EnquiryStatus; q?: string };
  active: boolean;
  label: string;
  count: number;
}) {
  const search = new URLSearchParams();
  if (href.status) search.set('status', href.status);
  if (href.q) search.set('q', href.q);
  const query = search.toString();

  return (
    <Link
      href={query ? `/enquiries?${query}` : '/enquiries'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
        active ? 'bg-stone-900 text-white' : 'text-ink-muted hover:bg-stone-100 hover:text-ink',
      )}
    >
      {label}
      <span className={cn('tnum', active ? 'text-stone-400' : 'text-ink-subtle')}>{count}</span>
    </Link>
  );
}
