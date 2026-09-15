'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Copy } from 'lucide-react';
import { apiPost, ClientApiError, errorMessage } from '@/lib/client';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/display';
import { Checkbox, Field, Input, Select } from '@/components/ui/form';
import { useToast } from '@/components/ui/overlay';
import { money } from '@/lib/format';
import { FAIR_USE_UNLIMITED } from '@/lib/types';
import type { Enquiry, Plan, ProvisionResult } from '@/lib/types';

/** A quiet, sensible starting password the operator can read out over the phone. */
function suggestPassword(): string {
  const words = ['salon', 'shine', 'style', 'bloom', 'polish', 'velvet'];
  const word = words[Math.floor(Math.random() * words.length)];
  return `${word![0]!.toUpperCase()}${word!.slice(1)}@${Math.floor(1000 + Math.random() * 9000)}`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

interface FormState {
  name: string;
  slug: string;
  legalName: string;
  gstin: string;
  phone: string;
  email: string;
  addressLine: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  planCode: string;
  trialDays: number;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerPassword: string;
  branchName: string;
  branchCode: string;
  seedDefaults: boolean;
}

const EMPTY: FormState = {
  name: '',
  slug: '',
  legalName: '',
  gstin: '',
  phone: '',
  email: '',
  addressLine: '',
  city: '',
  state: '',
  stateCode: '',
  pincode: '',
  planCode: '',
  trialDays: 14,
  ownerName: '',
  ownerEmail: '',
  ownerPhone: '',
  ownerPassword: '',
  branchName: 'Main Branch',
  branchCode: 'MAIN',
  seedDefaults: true,
};

/**
 * When this form is opened from an enquiry, everything the salon typed on the
 * website is already in the boxes — the operator is correcting a form, not
 * transcribing a phone call. Submitting then goes through the convert route, so
 * the enquiry is marked won and linked to the salon in the same breath.
 */
export function ProvisionForm({ plans, enquiry = null }: { plans: Plan[]; enquiry?: Enquiry | null }) {
  const router = useRouter();
  const toast = useToast();

  // Every salon should start on the pilot. Selecting a paid plan up front means
  // charging someone before they have seen the product work on their own data.
  const pilot = plans.find((plan) => plan.code === 'PILOT');

  const [form, setForm] = useState<FormState>({
    ...EMPTY,
    ...(enquiry
      ? {
          name: enquiry.salonName,
          phone: enquiry.phone,
          email: enquiry.email,
          city: enquiry.city ?? '',
          ownerName: enquiry.contactName,
          ownerEmail: enquiry.email,
          ownerPhone: enquiry.phone,
        }
      : {}),
    planCode: pilot?.code ?? '',
    ownerPassword: suggestPassword(),
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ProvisionResult | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const slug = slugTouched ? form.slug : slugify(form.name);

  const selectedPlan = useMemo(() => plans.find((plan) => plan.code === form.planCode), [plans, form.planCode]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFieldErrors({});
    setBusy(true);

    try {
      const created = await apiPost<ProvisionResult>(
        enquiry ? `platform/enquiries/${enquiry.id}/convert` : 'platform/tenants',
        {
          name: form.name,
          slug: slug || undefined,
          legalName: form.legalName || undefined,
          gstin: form.gstin || undefined,
          phone: form.phone,
          email: form.email,
          addressLine: form.addressLine || undefined,
          city: form.city || undefined,
          state: form.state || undefined,
          stateCode: form.stateCode || undefined,
          pincode: form.pincode || undefined,
          currency: 'INR',
          timezone: 'Asia/Kolkata',
          planCode: form.planCode || undefined,
          trialDays: form.trialDays,
          owner: {
            name: form.ownerName,
            email: form.ownerEmail,
            phone: form.ownerPhone || undefined,
            password: form.ownerPassword,
          },
          branch: { name: form.branchName, code: form.branchCode.toUpperCase() },
          seedDefaults: form.seedDefaults,
        },
      );

      setResult(created);
      toast.success(`${created.tenant.name} is live`);
      router.refresh();
    } catch (error) {
      // The API returns zod issues as details; surface them against their fields
      // rather than dumping a blob into a toast.
      if (error instanceof ClientApiError && Array.isArray(error.details)) {
        const next: Record<string, string> = {};
        for (const issue of error.details as { path?: string; message?: string }[]) {
          if (issue.path) next[issue.path.replace(/^body\./, '')] = issue.message ?? 'Invalid';
        }
        setFieldErrors(next);
      }
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return <Handover result={result} password={form.ownerPassword} enquiry={enquiry} />;
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Card>
        <CardHeader title="The salon" subtitle="What the business is called and how to reach it" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Salon name" required error={fieldErrors.name} className="sm:col-span-2">
            {({ id }) => (
              <Input
                id={id}
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="The salon's name"
                required
                autoFocus
              />
            )}
          </Field>

          <Field
            label="Booking URL"
            hint="Used for /book/…"
            error={fieldErrors.slug}
            className="sm:col-span-2"
          >
            {({ id }) => (
              <div className="flex items-center gap-0">
                <span className="h-9 shrink-0 rounded-l-lg border border-r-0 border-stone-300 bg-stone-50 px-3 text-sm leading-9 text-ink-muted">
                  /book/
                </span>
                <Input
                  id={id}
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set('slug', slugify(e.target.value));
                  }}
                  placeholder="the-salon"
                  className="rounded-l-none font-mono text-xs"
                />
              </div>
            )}
          </Field>

          <Field label="Legal name" hint="For invoices" error={fieldErrors.legalName}>
            {({ id }) => (
              <Input
                id={id}
                value={form.legalName}
                onChange={(e) => set('legalName', e.target.value)}
                placeholder="Their registered company name"
              />
            )}
          </Field>

          <Field label="GSTIN" error={fieldErrors.gstin}>
            {({ id }) => (
              <Input
                id={id}
                value={form.gstin}
                onChange={(e) => set('gstin', e.target.value.toUpperCase())}
                placeholder="29ABCDE1234F1Z5"
                maxLength={15}
                className="font-mono text-xs uppercase"
              />
            )}
          </Field>

          <Field label="Phone" required error={fieldErrors.phone}>
            {({ id }) => (
              <Input
                id={id}
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="9876543210"
                inputMode="tel"
                required
              />
            )}
          </Field>

          <Field label="Email" required error={fieldErrors.email}>
            {({ id }) => (
              <Input
                id={id}
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="hello@theirsalon.in"
                required
              />
            )}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Address" subtitle="The state code decides CGST/SGST versus IGST on their bills" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Address" error={fieldErrors.addressLine} className="sm:col-span-2">
            {({ id }) => (
              <Input
                id={id}
                value={form.addressLine}
                onChange={(e) => set('addressLine', e.target.value)}
                placeholder="12, MG Road"
              />
            )}
          </Field>

          <Field label="City" error={fieldErrors.city}>
            {({ id }) => <Input id={id} value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Bengaluru" />}
          </Field>

          <Field label="State" error={fieldErrors.state}>
            {({ id }) => <Input id={id} value={form.state} onChange={(e) => set('state', e.target.value)} placeholder="Karnataka" />}
          </Field>

          <Field label="State code" hint="GST, e.g. 29" error={fieldErrors.stateCode}>
            {({ id }) => (
              <Input
                id={id}
                value={form.stateCode}
                onChange={(e) => set('stateCode', e.target.value)}
                placeholder="29"
                maxLength={2}
                className="tnum"
              />
            )}
          </Field>

          <Field label="PIN code" error={fieldErrors.pincode}>
            {({ id }) => (
              <Input
                id={id}
                value={form.pincode}
                onChange={(e) => set('pincode', e.target.value)}
                placeholder="560001"
                maxLength={6}
                inputMode="numeric"
                className="tnum"
              />
            )}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Owner login" subtitle="The first person who can sign in — they invite everyone else" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Owner name" required error={fieldErrors['owner.name']}>
            {({ id }) => (
              <Input id={id} value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} placeholder="Priya Sharma" required />
            )}
          </Field>

          <Field label="Owner email" required error={fieldErrors['owner.email']} hint="This is their username">
            {({ id }) => (
              <Input
                id={id}
                type="email"
                value={form.ownerEmail}
                onChange={(e) => set('ownerEmail', e.target.value)}
                placeholder="owner@theirsalon.in"
                required
              />
            )}
          </Field>

          <Field label="Owner phone" error={fieldErrors['owner.phone']}>
            {({ id }) => (
              <Input id={id} value={form.ownerPhone} onChange={(e) => set('ownerPhone', e.target.value)} placeholder="9876543210" inputMode="tel" />
            )}
          </Field>

          <Field label="Starting password" required error={fieldErrors['owner.password']} hint="Ask them to change it">
            {({ id }) => (
              <div className="flex gap-2">
                <Input
                  id={id}
                  value={form.ownerPassword}
                  onChange={(e) => set('ownerPassword', e.target.value)}
                  minLength={8}
                  required
                  className="font-mono text-xs"
                />
                <Button type="button" variant="secondary" onClick={() => set('ownerPassword', suggestPassword())}>
                  New
                </Button>
              </div>
            )}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="First branch & plan" subtitle="More branches can be added from inside the salon's own app" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Branch name" required error={fieldErrors['branch.name']}>
            {({ id }) => <Input id={id} value={form.branchName} onChange={(e) => set('branchName', e.target.value)} required />}
          </Field>

          <Field label="Branch code" required error={fieldErrors['branch.code']} hint="Shows on invoice numbers">
            {({ id }) => (
              <Input
                id={id}
                value={form.branchCode}
                onChange={(e) => set('branchCode', e.target.value.toUpperCase())}
                maxLength={20}
                required
                className="font-mono text-xs uppercase"
              />
            )}
          </Field>

          <Field label="Plan" hint="Optional — can be set later" error={fieldErrors.planCode}>
            {({ id }) => (
              <Select id={id} value={form.planCode} onChange={(e) => set('planCode', e.target.value)}>
                <option value="">No plan yet</option>
                {plans.map((plan) => (
                  <option key={plan.code} value={plan.code}>
                    {plan.name} — {money(plan.pricePerMonth)}/month
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Trial length" hint="Days" error={fieldErrors.trialDays}>
            {({ id }) => (
              <Input
                id={id}
                type="number"
                min={0}
                max={90}
                value={form.trialDays}
                onChange={(e) => set('trialDays', Number(e.target.value))}
                className="tnum text-right"
              />
            )}
          </Field>

          {selectedPlan ? (
            <p className="tnum sm:col-span-2 rounded-lg bg-stone-50 p-3 text-2xs leading-relaxed text-ink-muted">
              <strong className="font-medium text-ink">{selectedPlan.name}</strong> allows {selectedPlan.maxBranches} branch
              {selectedPlan.maxBranches === 1 ? '' : 'es'}, {selectedPlan.maxStaff} staff and{' '}
              {selectedPlan.maxCustomers >= FAIR_USE_UNLIMITED
                ? 'unlimited customers'
                : `${selectedPlan.maxCustomers.toLocaleString('en-IN')} customers`}
              , with {selectedPlan.waUtilityQuota.toLocaleString('en-IN')} WhatsApp utility messages a month
              {selectedPlan.waMarketingQuota > 0
                ? ` and ${selectedPlan.waMarketingQuota.toLocaleString('en-IN')} marketing`
                : ' and no marketing messages'}
              {selectedPlan.maxCampaignsPerMonth >= FAIR_USE_UNLIMITED
                ? ', with unlimited campaigns'
                : `, and ${selectedPlan.maxCampaignsPerMonth} campaigns a month`}
              .
              {selectedPlan.code === 'PILOT' ? (
                <>
                  {' '}
                  <strong className="font-medium text-ink">
                    The pilot gets the whole product for {form.trialDays} days
                  </strong>{' '}
                  — campaigns, automation and analytics — and runs out of messages rather than features, so the
                  upgrade conversation is about what they actually used.
                </>
              ) : null}
            </p>
          ) : null}

          <div className="sm:col-span-2">
            <Checkbox
              checked={form.seedDefaults}
              onChange={(e) => set('seedDefaults', e.target.checked)}
              label="Seed a starter catalogue"
              description="Common service categories, GST rates, appointment statuses and message templates, so the salon isn't staring at an empty app."
            />
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <ButtonLink href="/tenants" variant="secondary">
          Cancel
        </ButtonLink>
        <Button type="submit" loading={busy}>
          Create salon
        </Button>
      </div>
    </form>
  );
}

/** What the operator reads out to the salon owner once provisioning succeeds. */
function Handover({
  result,
  password,
  enquiry,
}: {
  result: ProvisionResult;
  password: string;
  enquiry?: Enquiry | null;
}) {
  const toast = useToast();

  const lines = [
    `Salon: ${result.tenant.name}`,
    `Sign in: ${result.owner.email}`,
    `Password: ${password}`,
    `Booking page: /book/${result.tenant.slug}`,
  ].join('\n');

  return (
    <Card>
      <CardBody className="space-y-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-ink">{result.tenant.name} is live</p>
            <p className="text-xs text-ink-muted">
              Tenant, {result.branch.name} and the owner account were created together. Hand these details over — the
              password is not shown again.
              {enquiry ? ' Their enquiry is marked won and now points at this salon.' : ''}
            </p>
          </div>
        </div>

        <dl className="divide-y divide-stone-100 rounded-xl border border-stone-200">
          <Detail label="Sign in with" value={result.owner.email} />
          <Detail label="Password" value={password} mono />
          <Detail label="Booking page" value={`/book/${result.tenant.slug}`} mono />
          <Detail label="First branch" value={`${result.branch.name} (${result.branch.code})`} />
        </dl>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(lines);
                toast.success('Copied');
              } catch {
                toast.error('Could not copy — select the text instead');
              }
            }}
          >
            <Copy className="h-4 w-4" />
            Copy handover details
          </Button>
          <ButtonLink href={`/tenants/${result.tenant.id}`}>Open the salon</ButtonLink>
          {enquiry ? (
            <ButtonLink href="/enquiries" variant="ghost">
              Back to enquiries
            </ButtonLink>
          ) : (
            <ButtonLink href="/tenants/new" variant="ghost">
              Onboard another
            </ButtonLink>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className={`text-sm text-ink ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}
