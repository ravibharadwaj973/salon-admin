import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Building2, Mail, MapPin, MessageSquareQuote, Phone, Users } from 'lucide-react';
import { apiFetchSafe } from '@/lib/api';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardBody, CardHeader, PageHeader } from '@/components/ui/display';
import { dateTime, fromNow, phone as formatPhone } from '@/lib/format';
import { StageBadge } from '../stage-badge';
import { EnquiryActions } from './enquiry-actions';
import type { Enquiry } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const enquiry = await apiFetchSafe<Enquiry>(`/platform/enquiries/${(await params).id}`);
  return { title: enquiry ? `${enquiry.salonName} — enquiry` : 'Enquiry' };
}

/**
 * One enquiry, and everything you need before the call: who they are, what they
 * said, what you said last time.
 *
 * Nothing on this page provisions anything by itself. Turning an enquiry into a
 * salon is a separate, deliberate step that carries you into the onboarding
 * form with their details already filled in.
 */
export default async function EnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const enquiry = await apiFetchSafe<Enquiry>(`/platform/enquiries/${id}`);
  if (!enquiry) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/enquiries" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        All enquiries
      </Link>

      <PageHeader
        title={enquiry.salonName}
        description={`${enquiry.contactName} asked to hear from you ${fromNow(enquiry.createdAt)}`}
        action={<StageBadge status={enquiry.status} />}
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="What they told us" subtitle={`Submitted ${dateTime(enquiry.createdAt)}`} />
            <CardBody className="space-y-4">
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Detail icon={Phone} label="Phone">
                  <a href={`tel:${enquiry.phone}`} className="tnum text-ink hover:text-brand-700">
                    {formatPhone(enquiry.phone)}
                  </a>
                </Detail>
                <Detail icon={Mail} label="Email">
                  <a href={`mailto:${enquiry.email}`} className="break-all text-ink hover:text-brand-700">
                    {enquiry.email}
                  </a>
                </Detail>
                <Detail icon={MapPin} label="City">
                  <span className="text-ink">{enquiry.city || '— not given'}</span>
                </Detail>
                <Detail icon={Users} label="Size">
                  <span className="text-ink">{enquiry.size || '— not given'}</span>
                </Detail>
              </dl>

              {enquiry.message ? (
                <figure className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                  <MessageSquareQuote className="h-4 w-4 text-ink-subtle" />
                  <blockquote className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                    {enquiry.message}
                  </blockquote>
                </figure>
              ) : (
                <p className="rounded-xl border border-dashed border-stone-200 p-4 text-xs text-ink-subtle">
                  They left the message box empty — worth opening the call by asking what made them look.
                </p>
              )}

              {enquiry.source ? (
                <p className="text-2xs text-ink-subtle">
                  Came from <span className="font-mono">{enquiry.source}</span>
                </p>
              ) : null}
            </CardBody>
          </Card>

          <EnquiryActions enquiry={enquiry} />
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="History" />
            <CardBody>
              <ol className="space-y-3 text-xs">
                <Event label="Enquiry received" at={enquiry.createdAt} />
                {enquiry.contactedAt ? <Event label="First replied to" at={enquiry.contactedAt} /> : null}
                {enquiry.convertedAt ? <Event label="Became a salon" at={enquiry.convertedAt} /> : null}
                {!enquiry.contactedAt ? (
                  <li className="text-rose-700">
                    Nobody has replied yet — {fromNow(enquiry.createdAt)}.
                  </li>
                ) : null}
              </ol>
            </CardBody>
          </Card>

          {enquiry.convertedTenantId ? (
            <Card>
              <CardHeader title="They are on the platform" subtitle="This enquiry became a salon" />
              <CardBody>
                <ButtonLink href={`/tenants/${enquiry.convertedTenantId}`} className="w-full">
                  <Building2 className="h-4 w-4" />
                  Open {enquiry.salonName}
                </ButtonLink>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardHeader
                title="Ready to onboard them?"
                subtitle="Opens the onboarding form with what they told us already filled in"
              />
              <CardBody className="space-y-3">
                <ButtonLink href={`/tenants/new?enquiry=${enquiry.id}`} className="w-full">
                  Create the salon
                  <ArrowRight className="h-4 w-4" />
                </ButtonLink>
                <p className="text-2xs leading-relaxed text-ink-subtle">
                  You set their first password there and read it out on the call. Once the salon is created this
                  enquiry is marked won and linked to it.
                </p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-2xs uppercase tracking-wide text-ink-subtle">
        <Icon className="h-3 w-3" />
        {label}
      </dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

function Event({ label, at }: { label: string; at: string }) {
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span className="text-ink">{label}</span>
      <span className="shrink-0 text-ink-subtle">{dateTime(at)}</span>
    </li>
  );
}
