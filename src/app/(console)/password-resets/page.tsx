import type { Metadata } from 'next';
import Link from 'next/link';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { apiFetchSafe } from '@/lib/api';
import { Card, CardHeader, EmptyState, PageHeader } from '@/components/ui/display';
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table';
import { dateTime, fromNow } from '@/lib/format';
import { ResetDecision } from './decision';

export const metadata: Metadata = { title: 'Password resets' };
export const dynamic = 'force-dynamic';

interface ResetRequest {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantStatus: string;
  salonEmail: string | null;
  salonPhone: string | null;
  name: string;
  email: string;
  userPhone: string | null;
  lastLoginAt: string | null;
  requestedAt: string;
  requestedIp: string | null;
}

/**
 * THE ONE LOCKOUT A SALON CANNOT SOLVE FOR ITSELF.
 *
 * Everybody else in a salon is reset by a colleague standing next to them, in
 * the app, in about ten seconds — no email, no link, and an identity check
 * stronger than anything we could perform from here, because the manager is
 * looking at the person's face.
 *
 * What lands on this page is the exception: a salon's ONLY owner, locked out.
 * Nobody inside the business can reset them, because nobody has more reach than
 * they do. That is the entire contents of this queue by design, and it should
 * stay small. A long list here means something else is wrong — most likely that
 * salons are running with a single owner account and no second one for exactly
 * this situation.
 *
 * ── How to work a row ───────────────────────────────────────────────────
 *
 * The salon's own contact details are printed beside every request, and they are
 * the point. The check is: ring the number ON THE ACCOUNT and satisfy yourself
 * the person who asked is the person who answers. Anything the requester
 * supplied is not evidence — a request is easy to raise with nothing but a
 * business name and a guess at an email.
 *
 * Approving posts a single-use link to the address already on the account and
 * shows nobody a password, here or anywhere. Support does not hold credentials
 * for a salon, and that is not an accident of the implementation: it is what
 * makes it safe for somebody to ring us claiming to be an owner.
 */
export default async function PasswordResetsPage() {
  const requests = (await apiFetchSafe<ResetRequest[]>('/platform/password-requests')) ?? [];

  return (
    <>
      <PageHeader
        title="Password resets"
        description="Owners who cannot sign in, and nobody in their salon can help them"
      />

      <Card>
        <CardHeader
          title={requests.length === 0 ? 'Nothing waiting' : `${requests.length} waiting`}
          subtitle="Verify against the salon's own contact details — never against what the person asking has told you"
        />

        {requests.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Nobody is locked out"
            description="Staff, managers and admins are reset by a colleague inside the salon. Only a salon's sole owner reaches this queue."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Who</TH>
                <TH>Salon</TH>
                <TH>Ring this to check</TH>
                <TH>Asked</TH>
                <TH>Last signed in</TH>
                <TH align="right">&nbsp;</TH>
              </TR>
            </THead>
            <TBody>
              {requests.map((request) => (
                <TR key={request.id}>
                  <TD>
                    <span className="block font-medium text-ink">{request.name}</span>
                    {/* The address the link would go to, shown before the
                        decision rather than after it. */}
                    <span className="block text-2xs text-ink-subtle">{request.email}</span>
                  </TD>

                  <TD>
                    <Link href={`/tenants/${request.tenantId}`} className="font-medium text-ink hover:text-brand-700">
                      {request.tenantName}
                    </Link>
                    <span className="block text-2xs text-ink-subtle">
                      {request.tenantSlug}
                      {request.tenantStatus && request.tenantStatus !== 'ACTIVE' ? ` · ${request.tenantStatus.toLowerCase()}` : ''}
                    </span>
                  </TD>

                  <TD className="text-xs text-ink-muted">
                    {/**
                     * THE SALON'S DETAILS, NOT THE REQUESTER'S.
                     *
                     * This column is the whole identity check. Calling a number
                     * the person asking gave you verifies nothing at all — it is
                     * the one mistake that turns this queue into a way of taking
                     * over a salon, so the only number shown is the one already
                     * on the account.
                     */}
                    {request.salonPhone ? <span className="block tnum">{request.salonPhone}</span> : null}
                    {request.salonEmail ? <span className="block">{request.salonEmail}</span> : null}
                    {!request.salonPhone && !request.salonEmail ? (
                      <span className="text-amber-700">
                        No contact details on this salon — verify another way before approving.
                      </span>
                    ) : null}
                  </TD>

                  <TD className="text-xs text-ink-muted">
                    <span className="block">{fromNow(request.requestedAt)}</span>
                    <span className="block text-2xs text-ink-subtle" title={dateTime(request.requestedAt)}>
                      {request.requestedIp ? `from ${request.requestedIp}` : 'address not recorded'}
                    </span>
                  </TD>

                  <TD className="text-xs text-ink-subtle">
                    {request.lastLoginAt ? fromNow(request.lastLoginAt) : 'never'}
                  </TD>

                  <TD align="right">
                    <ResetDecision
                      requestId={request.id}
                      name={request.name}
                      email={request.email}
                      salonName={request.tenantName}
                    />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <p className="mt-4 flex items-start gap-2 rounded-lg border border-stone-200 bg-white p-3 text-xs leading-relaxed text-ink-muted">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle" aria-hidden />
        <span>
          Approving never shows you a password. A single-use link goes to the address on the account, expires in two
          hours, and signs the owner out everywhere once used. Both approvals and refusals are written into that
          salon’s own activity log, with your name and your reason on them.
        </span>
      </p>
    </>
  );
}
