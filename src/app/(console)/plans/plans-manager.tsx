'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Archive, Pencil, Plus, Trash2 } from 'lucide-react';
import { apiDelete, apiPatch, apiPost, ClientApiError, errorMessage } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, CardHeader, EmptyState } from '@/components/ui/display';
import { Checkbox, Field, Input } from '@/components/ui/form';
import { Modal, useToast } from '@/components/ui/overlay';
import { count, money } from '@/lib/format';
import { FAIR_USE_UNLIMITED, FEATURE_LABELS, type Plan } from '@/lib/types';

type PlanWithCount = Plan & { _count?: { tenants: number } };

const limit = (n: number) => (n >= FAIR_USE_UNLIMITED ? 'Unlimited' : count(n));

interface PlanForm {
  code: string;
  name: string;
  pricePerMonth: string;
  pricePerYear: string;
  maxBranches: string;
  maxStaff: string;
  maxCustomers: string;
  waUtilityQuota: string;
  waMarketingQuota: string;
  waAuthQuota: string;
  smsQuota: string;
  emailQuota: string;
  maxCampaignsPerMonth: string;
  extraBranchPrice: string;
  features: Record<string, boolean>;
  isActive: boolean;
}

const BLANK: PlanForm = {
  code: '',
  name: '',
  pricePerMonth: '',
  pricePerYear: '',
  maxBranches: '1',
  maxStaff: '5',
  maxCustomers: '1000',
  waUtilityQuota: '500',
  waMarketingQuota: '0',
  waAuthQuota: '0',
  smsQuota: '250',
  emailQuota: '2000',
  maxCampaignsPerMonth: '3',
  extraBranchPrice: '',
  features: {},
  isActive: true,
};

function toForm(plan: Plan): PlanForm {
  return {
    code: plan.code,
    name: plan.name,
    pricePerMonth: String(plan.pricePerMonth ?? ''),
    pricePerYear: plan.pricePerYear === null ? '' : String(plan.pricePerYear),
    maxBranches: String(plan.maxBranches),
    maxStaff: String(plan.maxStaff),
    maxCustomers: String(plan.maxCustomers),
    waUtilityQuota: String(plan.waUtilityQuota),
    waMarketingQuota: String(plan.waMarketingQuota),
    waAuthQuota: String(plan.waAuthQuota),
    smsQuota: String(plan.smsQuota),
    emailQuota: String(plan.emailQuota),
    maxCampaignsPerMonth: String(plan.maxCampaignsPerMonth ?? 3),
    extraBranchPrice: plan.extraBranchPrice === null ? '' : String(plan.extraBranchPrice),
    features: plan.features ?? {},
    isActive: plan.isActive,
  };
}

export function PlansManager({ initialPlans }: { initialPlans: PlanWithCount[] }) {
  const router = useRouter();
  const toast = useToast();

  const [editing, setEditing] = useState<PlanWithCount | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<PlanForm>(BLANK);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<PlanWithCount | null>(null);

  const open = creating || editing !== null;

  const set = <K extends keyof PlanForm>(key: K, value: PlanForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleFeature = (key: string, on: boolean) =>
    setForm((prev) => ({ ...prev, features: { ...prev.features, [key]: on } }));

  function startCreate() {
    setForm(BLANK);
    setFieldErrors({});
    setEditing(null);
    setCreating(true);
  }

  function startEdit(plan: PlanWithCount) {
    setForm(toForm(plan));
    setFieldErrors({});
    setCreating(false);
    setEditing(plan);
  }

  function close() {
    setCreating(false);
    setEditing(null);
  }

  /**
   * Delete is for a plan that was a mistake. A plan salons are on is retired
   * instead — they keep it, it stops being offered to anyone new — which is
   * why both actions live behind the same button and the dialog decides.
   */
  async function remove() {
    if (!removing) return;
    setBusy(true);
    try {
      await apiDelete(`platform/plans/${removing.id}`);
      toast.success(`${removing.name} deleted`);
      setRemoving(null);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function retire(plan: PlanWithCount) {
    setBusy(true);
    try {
      await apiPatch(`platform/plans/${plan.id}`, { isActive: false });
      toast.success(`${plan.name} retired — the ${plan._count?.tenants ?? 0} salon(s) on it are unaffected`);
      setRemoving(null);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setFieldErrors({});

    const payload = {
      code: form.code,
      name: form.name,
      pricePerMonth: Number(form.pricePerMonth || 0),
      pricePerYear: form.pricePerYear === '' ? undefined : Number(form.pricePerYear),
      maxBranches: Number(form.maxBranches || 1),
      maxStaff: Number(form.maxStaff || 1),
      maxCustomers: Number(form.maxCustomers || 1),
      waUtilityQuota: Number(form.waUtilityQuota || 0),
      waMarketingQuota: Number(form.waMarketingQuota || 0),
      waAuthQuota: Number(form.waAuthQuota || 0),
      smsQuota: Number(form.smsQuota || 0),
      emailQuota: Number(form.emailQuota || 0),
      maxCampaignsPerMonth: Number(form.maxCampaignsPerMonth || 0),
      extraBranchPrice: form.extraBranchPrice === '' ? null : Number(form.extraBranchPrice),
      features: form.features,
    };

    try {
      if (editing) {
        // The code is a stable key other records point at, so it is not editable.
        const { code: _code, ...rest } = payload;
        await apiPatch(`platform/plans/${editing.id}`, { ...rest, isActive: form.isActive });
        toast.success('Plan updated');
      } else {
        await apiPost('platform/plans', payload);
        toast.success('Plan created');
      }
      close();
      router.refresh();
    } catch (error) {
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

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={startCreate}>
          <Plus className="h-4 w-4" />
          New plan
        </Button>
      </div>

      {initialPlans.length === 0 ? (
        <EmptyState
          title="No plans yet"
          description="Create at least one plan before onboarding a salon that is meant to pay you."
          action={<Button onClick={startCreate}>Create the first plan</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {initialPlans.map((plan) => {
            const on = Object.entries(plan.features ?? {}).filter(([, v]) => v).length;
            return (
              <Card key={plan.id} className={plan.isActive ? undefined : 'opacity-60'}>
                <CardHeader
                  title={
                    <span className="flex items-center gap-2">
                      {plan.name}
                      {plan.isActive ? null : <Badge tone="neutral">Retired</Badge>}
                    </span>
                  }
                  subtitle={<span className="font-mono text-2xs uppercase">{plan.code}</span>}
                  action={
                    <span className="flex items-center">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(plan)} aria-label={`Edit ${plan.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRemoving(plan)}
                        aria-label={`Remove ${plan.name}`}
                        className="text-ink-subtle hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </span>
                  }
                />
                <CardBody className="space-y-3">
                  <p className="tnum text-2xl font-semibold text-ink">
                    {money(plan.pricePerMonth)}
                    <span className="text-xs font-normal text-ink-muted">/month</span>
                  </p>

                  <dl className="divide-y divide-stone-100 border-t border-stone-100 pt-1 text-xs">
                    <Row label="Branches" value={limit(plan.maxBranches)} />
                    <Row label="Staff" value={limit(plan.maxStaff)} />
                    <Row label="Customers" value={limit(plan.maxCustomers)} />
                    <Row label="Campaigns / month" value={limit(plan.maxCampaignsPerMonth ?? 3)} />
                  </dl>

                  <div>
                    <p className="mb-1 text-2xs font-medium uppercase tracking-wide text-ink-subtle">
                      Monthly messages
                    </p>
                    <dl className="divide-y divide-stone-100 border-t border-stone-100 text-xs">
                      <Row label="WhatsApp utility" value={count(plan.waUtilityQuota)} />
                      <Row
                        label="WhatsApp marketing"
                        value={plan.waMarketingQuota > 0 ? count(plan.waMarketingQuota) : '—'}
                        muted={plan.waMarketingQuota === 0}
                      />
                      <Row label="SMS" value={count(plan.smsQuota)} />
                      <Row label="Email" value={count(plan.emailQuota)} />
                    </dl>
                  </div>

                  <p className="text-2xs text-ink-subtle">
                    {on} feature{on === 1 ? '' : 's'} ·{' '}
                    {plan.extraBranchPrice
                      ? `extra branch ${money(plan.extraBranchPrice)}`
                      : 'no extra branches'}
                    {' · '}
                    {plan._count?.tenants
                      ? `${plan._count.tenants} salon${plan._count.tenants === 1 ? '' : 's'}`
                      : 'no salons'}
                  </p>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <RemovePlanModal
        plan={removing}
        busy={busy}
        onClose={() => setRemoving(null)}
        onDelete={remove}
        onRetire={() => removing && retire(removing)}
      />

      <Modal
        open={open}
        onClose={close}
        title={editing ? `Edit ${editing.name}` : 'New plan'}
        description={
          editing
            ? 'Allowance changes apply from the salon’s next billing month, not mid-month.'
            : 'Allowances reset on the 1st. Anything beyond them comes out of purchased credits.'
        }
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={save} loading={busy}>
              {editing ? 'Save changes' : 'Create plan'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code" required error={fieldErrors.code} hint={editing ? 'Cannot be changed' : 'e.g. GROWTH'}>
              {({ id }) => (
                <Input
                  id={id}
                  value={form.code}
                  onChange={(e) => set('code', e.target.value.toUpperCase())}
                  disabled={editing !== null}
                  placeholder="GROWTH"
                  className="font-mono text-xs uppercase"
                />
              )}
            </Field>

            <Field label="Name" required error={fieldErrors.name}>
              {({ id }) => <Input id={id} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Growth" />}
            </Field>

            <NumField label="Price per month (₹)" required value={form.pricePerMonth} onChange={(v) => set('pricePerMonth', v)} error={fieldErrors.pricePerMonth} />
            <NumField label="Price per year (₹)" hint="Optional" value={form.pricePerYear} onChange={(v) => set('pricePerYear', v)} error={fieldErrors.pricePerYear} />
          </div>

          <Fieldset legend="Limits" hint={`Enter ${count(FAIR_USE_UNLIMITED)} for “unlimited” — a fair-use ceiling, not an unbounded promise.`}>
            <NumField label="Max branches" value={form.maxBranches} onChange={(v) => set('maxBranches', v)} error={fieldErrors.maxBranches} />
            <NumField label="Max staff" value={form.maxStaff} onChange={(v) => set('maxStaff', v)} error={fieldErrors.maxStaff} />
            <NumField label="Max customers" value={form.maxCustomers} onChange={(v) => set('maxCustomers', v)} error={fieldErrors.maxCustomers} />
            <NumField
              label="Campaigns per month"
              hint={`${count(FAIR_USE_UNLIMITED)} for unlimited`}
              value={form.maxCampaignsPerMonth}
              onChange={(v) => set('maxCampaignsPerMonth', v)}
              error={fieldErrors.maxCampaignsPerMonth}
            />
            <NumField
              label="Extra branch (₹/month)"
              hint="Blank to refuse"
              value={form.extraBranchPrice}
              onChange={(v) => set('extraBranchPrice', v)}
              error={fieldErrors.extraBranchPrice}
            />
          </Fieldset>

          <Fieldset
            legend="Monthly message allowances"
            hint="WhatsApp marketing costs roughly 7.5× utility, which is why they are counted apart."
          >
            <NumField label="WhatsApp utility" value={form.waUtilityQuota} onChange={(v) => set('waUtilityQuota', v)} error={fieldErrors.waUtilityQuota} />
            <NumField label="WhatsApp marketing" value={form.waMarketingQuota} onChange={(v) => set('waMarketingQuota', v)} error={fieldErrors.waMarketingQuota} />
            <NumField label="WhatsApp authentication" value={form.waAuthQuota} onChange={(v) => set('waAuthQuota', v)} error={fieldErrors.waAuthQuota} />
            <NumField label="SMS" value={form.smsQuota} onChange={(v) => set('smsQuota', v)} error={fieldErrors.smsQuota} />
            <NumField label="Email" value={form.emailQuota} onChange={(v) => set('emailQuota', v)} error={fieldErrors.emailQuota} />
          </Fieldset>

          <div>
            <p className="mb-1 text-xs font-medium text-ink">Features included</p>
            <p className="mb-3 text-2xs text-ink-muted">
              A salon without a feature gets a clear “not in your plan” message instead of the screen.
            </p>
            <div className="grid gap-2 rounded-lg border border-stone-200 p-3 sm:grid-cols-2">
              {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                <Checkbox
                  key={key}
                  checked={form.features[key] === true}
                  onChange={(e) => toggleFeature(key, e.target.checked)}
                  label={label}
                />
              ))}
            </div>
          </div>

          {editing ? (
            <div className="border-t border-stone-100 pt-4">
              <Checkbox
                checked={form.isActive}
                onChange={(e) => set('isActive', e.target.checked)}
                label="Offer this plan to new salons"
                description="Turning this off hides the plan when onboarding. Salons already on it keep their limits."
              />
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}

function Fieldset({ legend, hint, children }: { legend: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-stone-200 p-4">
      <legend className="px-1.5 text-xs font-medium text-ink">{legend}</legend>
      {hint ? <p className="mb-3 text-2xs text-ink-muted">{hint}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function NumField({
  label,
  value,
  onChange,
  hint,
  error,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {({ id }) => (
        <Input
          id={id}
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="tnum text-right"
        />
      )}
    </Field>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={`tnum font-medium ${muted ? 'text-ink-subtle' : 'text-ink'}`}>{value}</dd>
    </div>
  );
}

/**
 * One button, two outcomes, and the salon count decides which.
 *
 * A plan nobody is on can just go. A plan salons are paying on cannot: deleting
 * it would leave them with no limits, no allowances and no features, which
 * reads to them as the product breaking. Retiring keeps them exactly as they
 * are and only stops the plan being offered to anyone new — so that is what
 * this offers, and delete is not shown at all.
 */
function RemovePlanModal({
  plan,
  busy,
  onClose,
  onDelete,
  onRetire,
}: {
  plan: (Plan & { _count?: { tenants: number } }) | null;
  busy: boolean;
  onClose: () => void;
  onDelete: () => void;
  onRetire: () => void;
}) {
  const inUse = (plan?._count?.tenants ?? 0) > 0;
  const salons = plan?._count?.tenants ?? 0;

  const [typed, setTyped] = useState('');

  // Clear the box whenever a different plan is opened, so a phrase typed for
  // one plan can never arm the delete button for another.
  useEffect(() => {
    setTyped('');
    setPasteBlocked(false);
  }, [plan?.id]);

  const [pasteBlocked, setPasteBlocked] = useState(false);

  const phrase = plan ? `delete ${plan.code}` : '';
  const confirmed = typed.trim().toLowerCase() === phrase.toLowerCase();

  /**
   * Pasting is refused, and so is dropping text in.
   *
   * The whole value of a typed confirmation is the few seconds spent reading
   * what you are about to destroy. Copying the phrase off the label above and
   * pasting it back skips exactly that, which leaves the friction without the
   * thinking — so the box only accepts characters the operator typed.
   */
  function refusePaste(event: { preventDefault: () => void }) {
    event.preventDefault();
    setPasteBlocked(true);
  }

  return (
    <Modal
      open={plan !== null}
      onClose={onClose}
      title={plan ? (inUse ? `Retire ${plan.name}?` : `Delete ${plan.name}?`) : ''}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          {inUse ? (
            <Button onClick={onRetire} loading={busy} disabled={!plan?.isActive}>
              <Archive className="h-4 w-4" />
              {plan?.isActive ? 'Retire plan' : 'Already retired'}
            </Button>
          ) : (
            <Button variant="danger" onClick={onDelete} loading={busy} disabled={!confirmed}>
              <Trash2 className="h-4 w-4" />
              Delete plan
            </Button>
          )}
        </>
      }
    >
      {inUse ? (
        <div className="space-y-3">
          <p className="flex gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {salons} salon{salons === 1 ? ' is' : 's are'} on this plan, so it cannot be deleted — they would be
              left with no limits, no allowances and no features.
            </span>
          </p>
          <p className="text-sm leading-relaxed text-ink-muted">
            Retiring it instead changes nothing for those {salons === 1 ? 'salons' : 'salons'}. It only disappears
            from the list you can assign to a new salon, and from the pricing page.
          </p>
          <p className="text-xs text-ink-subtle">
            To be rid of it entirely, move those salons to another plan first, then delete it.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-muted">
            No salon is on this plan, so nothing is affected. This cannot be undone.
          </p>
          <p className="text-xs text-ink-subtle">
            Any credit pack restricted to this plan stays, and becomes available on every plan instead.
          </p>

          {/*
            Type to confirm. The phrase carries the plan's own code rather than
            a fixed wording, because a fixed one becomes muscle memory — and
            the mistake worth preventing here is deleting the wrong plan, not
            deleting too fast.
          */}
          <div>
            <label htmlFor="confirm-delete-plan" className="mb-1.5 block text-xs text-ink">
              Type{' '}
              {/* Not selectable, so the phrase cannot simply be dragged into the box below. */}
              <span className="select-none font-mono font-semibold text-ink">{phrase}</span> to confirm
            </label>
            <Input
              id="confirm-delete-plan"
              value={typed}
              onChange={(event) => {
                setTyped(event.target.value);
                setPasteBlocked(false);
              }}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={busy}
              onPaste={refusePaste}
              onDrop={refusePaste}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && confirmed && !busy) onDelete();
              }}
              className="font-mono text-xs"
            />
            <p className="mt-1.5 h-4 text-2xs text-ink-subtle">
              {pasteBlocked
                ? 'Pasting is off here — please type it out.'
                : typed.length > 0 && !confirmed
                  ? 'That does not match yet.'
                  : ''}
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
