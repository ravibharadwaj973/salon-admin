'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PauseCircle, PlayCircle, Wallet } from 'lucide-react';
import { apiPost, errorMessage } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/display';
import { Field, Input, Select } from '@/components/ui/form';
import { Modal, useToast } from '@/components/ui/overlay';
import { count, date, money } from '@/lib/format';
import {
  FAIR_USE_UNLIMITED,
  METER_LABELS,
  type CreditEntry,
  type CreditPack,
  type LimitsSummary,
  type MeterKey,
  type UsageSummary,
} from '@/lib/types';

const PAYMENT_MODES = ['UPI', 'BANK_TRANSFER', 'CASH', 'CHEQUE', 'CARD', 'OTHER'] as const;

export function TenantUsage({
  tenantId,
  usage,
  limits,
  packs,
  history,
}: {
  tenantId: string;
  usage: UsageSummary | null;
  limits: LimitsSummary | null;
  packs: CreditPack[];
  history: CreditEntry[];
}) {
  const router = useRouter();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    packCode: packs[0]?.code ?? '',
    amountPaid: '',
    paymentMode: 'UPI' as (typeof PAYMENT_MODES)[number],
    reference: '',
  });

  const selected = packs.find((p) => p.code === form.packCode);
  const sending = usage?.sending;

  async function unblock() {
    setBusy(true);
    try {
      await apiPost(`platform/tenants/${tenantId}/messaging/unblock`, { settleOwed: true });
      toast.success('Sending switched back on');
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function record() {
    setBusy(true);
    try {
      await apiPost(`platform/tenants/${tenantId}/credits`, {
        packCode: form.packCode,
        amountPaid: form.amountPaid ? Number(form.amountPaid) : undefined,
        paymentMode: form.paymentMode,
        reference: form.reference || undefined,
      });
      toast.success('Top-up recorded');
      setOpen(false);
      setForm((f) => ({ ...f, amountPaid: '', reference: '' }));
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {sending?.blocked ? (
        <Card className="mt-5 border-rose-300">
          <CardBody className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <PauseCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <div>
                <p className="text-sm font-semibold text-rose-900">Sending is paused for this salon</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {sending.reason ?? 'The message allowance was overdrawn.'}
                  {sending.blockedAt ? ` · since ${date(sending.blockedAt)}` : ''}
                </p>
                {sending.owedMessages > 0 ? (
                  <p className="tnum mt-1 text-xs text-ink">
                    <strong>{count(sending.owedMessages)} messages</strong> owed — sent beyond the allowance so a
                    running campaign could finish.
                  </p>
                ) : null}
              </div>
            </div>

            <Button loading={busy} onClick={unblock}>
              <PlayCircle className="h-4 w-4" />
              Switch sending back on
            </Button>
          </CardBody>
        </Card>
      ) : null}

      <Card className="mt-5">
        <CardHeader
          title="Messages this month"
          subtitle={
            usage
              ? `${usage.period.label} · resets in ${usage.period.daysLeft} day${usage.period.daysLeft === 1 ? '' : 's'}`
              : 'No usage recorded yet'
          }
          action={
            packs.length > 0 ? (
              <Button variant="secondary" onClick={() => setOpen(true)}>
                <Wallet className="h-4 w-4" />
                Record a top-up
              </Button>
            ) : null
          }
        />
        <CardBody className="space-y-4">
          {usage?.meters.map((meter) => {
            const over = meter.used > meter.included;
            return (
              <div key={meter.meter} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="text-ink">{meter.label}</span>
                  <span className="tnum text-ink-muted">
                    {count(meter.used)} / {count(meter.included)}
                    {meter.credits > 0 ? ` · ${count(meter.credits)} credits` : ''}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className={`h-full rounded-full ${
                      meter.blocked > 0 ? 'bg-rose-500' : over ? 'bg-amber-500' : 'bg-brand-500'
                    }`}
                    style={{ width: `${Math.min(100, meter.percentUsed)}%` }}
                  />
                </div>
                {meter.blocked > 0 ? (
                  <p className="text-2xs text-rose-600">
                    {count(meter.blocked)} message{meter.blocked === 1 ? '' : 's'} refused — allowance and credits both
                    empty.
                  </p>
                ) : null}
              </div>
            );
          })}

          {!usage ? <p className="text-xs text-ink-muted">This salon has not sent anything yet.</p> : null}
        </CardBody>
      </Card>

      {limits ? (
        <Card className="mt-5">
          <CardHeader
            title="Plan limits"
            subtitle={`Enforced by the API — ${limits.plan?.name ?? 'no plan'} · a salon at its ceiling is refused, not billed`}
          />
          <CardBody className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <LimitTile label="Branches" check={limits.branches} />
            <LimitTile label="Staff logins" check={limits.staff} />
            <LimitTile label="Customers" check={limits.customers} />
            {limits.campaigns ? <LimitTile label="Campaigns this month" check={limits.campaigns} /> : null}
          </CardBody>
        </Card>
      ) : null}

      {history.length > 0 ? (
        <Card className="mt-5">
          <CardHeader title="Top-ups" subtitle="Recorded by hand after payment arrived — there is no gateway" />
          <CardBody className="space-y-0 divide-y divide-stone-100 p-0">
            {history.map((entry) => (
              <div key={entry.id} className="flex items-start justify-between gap-4 px-5 py-3">
                <div>
                  <p className="text-sm text-ink">
                    {entry.delta > 0 ? '+' : ''}
                    {count(entry.delta)} {METER_LABELS[entry.meter]}
                  </p>
                  <p className="text-2xs text-ink-muted">
                    {date(entry.createdAt)}
                    {entry.pack ? ` · ${entry.pack.name}` : ''}
                    {entry.reference ? ` · ref ${entry.reference}` : ''}
                    {entry.createdBy ? ` · ${entry.createdBy}` : ''}
                  </p>
                </div>
                <span className="tnum shrink-0 text-sm text-ink">
                  {entry.amountPaid ? money(entry.amountPaid) : '—'}
                </span>
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Record a top-up"
        description="The salon has already paid you by UPI, transfer or cash. This adds the credits to their balance."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={record} loading={busy}>
              Add credits
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Pack" required>
            {({ id }) => (
              <Select id={id} value={form.packCode} onChange={(e) => setForm((f) => ({ ...f, packCode: e.target.value }))}>
                {packs.map((pack) => (
                  <option key={pack.code} value={pack.code}>
                    {pack.name} — {money(pack.price)}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="How they paid" required>
            {({ id }) => (
              <Select
                id={id}
                value={form.paymentMode}
                onChange={(e) => setForm((f) => ({ ...f, paymentMode: e.target.value as (typeof PAYMENT_MODES)[number] }))}
              >
                {PAYMENT_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode.replace(/_/g, ' ').toLowerCase()}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Amount received (₹)" hint={selected ? `Pack price is ${money(selected.price)}` : undefined}>
            {({ id }) => (
              <Input
                id={id}
                type="number"
                value={form.amountPaid}
                onChange={(e) => setForm((f) => ({ ...f, amountPaid: e.target.value }))}
                placeholder={selected ? String(selected.price) : ''}
                className="tnum text-right"
              />
            )}
          </Field>

          <Field label="Reference" hint="UPI ref, transfer number, cheque number">
            {({ id }) => (
              <Input id={id} value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} />
            )}
          </Field>

          {selected ? (
            <p className="rounded-lg bg-stone-50 p-3 text-2xs leading-relaxed text-ink-muted">
              Adds <strong className="font-medium text-ink">{count(selected.quantity)}</strong>{' '}
              {METER_LABELS[selected.meter]} credits. Credits carry over month to month and are only spent once the plan
              allowance is gone.
            </p>
          ) : null}
        </div>
      </Modal>
    </>
  );
}

/**
 * A limit is worth looking at when the salon is close to it — that is the moment
 * an upgrade answers their problem rather than being a sales call.
 */
function LimitTile({ label, check }: { label: string; check: { limit: number; current: number } }) {
  const unlimited = check.limit >= FAIR_USE_UNLIMITED;
  const ratio = unlimited || check.limit === 0 ? 0 : check.current / check.limit;
  const tone = ratio >= 1 ? 'text-rose-600' : ratio >= 0.8 ? 'text-amber-600' : 'text-ink';

  return (
    <div>
      <p className="text-2xs text-ink-muted">{label}</p>
      <p className={`tnum mt-0.5 text-lg font-semibold ${tone}`}>
        {count(check.current)}
        <span className="text-xs font-normal text-ink-subtle">
          {' / '}
          {unlimited ? '∞' : count(check.limit)}
        </span>
      </p>
      {!unlimited && ratio >= 0.8 ? (
        <p className="text-2xs text-amber-700">{ratio >= 1 ? 'At the limit' : 'Nearly full'}</p>
      ) : null}
    </div>
  );
}
