import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, CalendarClock, CheckCircle2 } from 'lucide-react';
import { apiFetchSafe } from '@/lib/api';
import { Badge, Card, CardHeader, EmptyState, PageHeader, StatTile } from '@/components/ui/display';
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table';
import { SendRemindersButton } from './send-reminders';
import { date, money } from '@/lib/format';

export const metadata: Metadata = { title: 'Renewals' };
export const dynamic = 'force-dynamic';

interface Upcoming {
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  planName: string;
  currentPeriodEnd: string;
  daysLeft: number;
}

interface Lapsed {
  tenantId: string;
  name: string;
  status: string;
  planCode: string;
  endedAt: string;
  daysOverdue: number;
}

/**
 * The working list for "who needs chasing".
 *
 * Nothing on this page happens on its own. Reminders go out on a schedule, but
 * switching a salon off is always a decision someone makes with the payment
 * history in front of them — a salon that paid by bank transfer on Friday
 * should not lose its till to a cron job on Saturday.
 */
export default async function RenewalsPage() {
  const data = await apiFetchSafe<{ upcoming: Upcoming[]; lapsed: Lapsed[] }>('/platform/renewals');
  const upcoming = data?.upcoming ?? [];
  const lapsed = data?.lapsed ?? [];
  const thisWeek = upcoming.filter((row) => row.daysLeft <= 7);

  return (
    <>
      <PageHeader
        title="Renewals"
        description="Who is up for renewal, and who has already lapsed"
        action={<SendRemindersButton />}
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="Due in the next fortnight" value={String(upcoming.length)} />
        <StatTile label="Due within a week" value={String(thisWeek.length)} tone={thisWeek.length > 0 ? 'negative' : 'neutral'} />
        <StatTile label="Already lapsed" value={String(lapsed.length)} tone={lapsed.length > 0 ? 'negative' : 'neutral'} />
      </section>

      <div className="space-y-5">
        <Card>
          <CardHeader
            title="Lapsed"
            subtitle="Plan period has ended. Still working — nothing is switched off automatically."
          />
          {lapsed.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Nobody has lapsed" description="Every paying salon is inside its plan period." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Salon</TH>
                  <TH>Plan</TH>
                  <TH>Ended</TH>
                  <TH align="right">Overdue</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {lapsed.map((row) => (
                  <TR key={row.tenantId}>
                    <TD>
                      <Link href={`/tenants/${row.tenantId}`} className="font-medium text-ink hover:text-brand-700">
                        {row.name}
                      </Link>
                    </TD>
                    <TD className="font-mono text-xs text-ink-muted">{row.planCode}</TD>
                    <TD className="text-ink-muted">{date(row.endedAt)}</TD>
                    <TD align="right">
                      <span className={row.daysOverdue > 14 ? 'font-medium text-rose-700' : 'text-ink-muted'}>
                        {row.daysOverdue} {row.daysOverdue === 1 ? 'day' : 'days'}
                      </span>
                    </TD>
                    <TD>
                      <Badge tone={row.status === 'PAST_DUE' ? 'warning' : 'neutral'}>
                        {row.status.replace(/_/g, ' ').toLowerCase()}
                      </Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader title="Coming up" subtitle="Reminders go out automatically at 14, 7, 3 and 1 days, and on the day" />
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Nothing due" description="No plan ends in the next fortnight." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Salon</TH>
                  <TH>Plan</TH>
                  <TH>Renews</TH>
                  <TH align="right">Days left</TH>
                  <TH>Email</TH>
                </TR>
              </THead>
              <TBody>
                {upcoming.map((row) => (
                  <TR key={`${row.tenantId}-${row.daysLeft}`}>
                    <TD>
                      <Link href={`/tenants/${row.tenantId}`} className="font-medium text-ink hover:text-brand-700">
                        {row.tenantName}
                      </Link>
                    </TD>
                    <TD className="text-ink-muted">{row.planName}</TD>
                    <TD className="text-ink-muted">{date(row.currentPeriodEnd)}</TD>
                    <TD align="right">
                      <Badge tone={row.daysLeft <= 3 ? 'warning' : 'neutral'}>
                        {row.daysLeft === 0 ? 'today' : `${row.daysLeft}`}
                      </Badge>
                    </TD>
                    <TD className="text-xs text-ink-subtle">{row.tenantEmail || '— no address on file'}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>

      <p className="mt-5 flex items-start justify-center gap-1.5 px-4 text-center text-xs text-ink-subtle">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Switching a salon off is never automatic. A switched-off salon keeps read access to all of its own records
        and simply cannot save anything new.
      </p>
    </>
  );
}
