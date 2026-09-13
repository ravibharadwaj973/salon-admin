'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, ShieldAlert } from 'lucide-react';
import { apiPatch, apiPost, errorMessage } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/form';
import { Modal, useToast } from '@/components/ui/overlay';
import { money } from '@/lib/format';
import type { Plan, TenantStatus } from '@/lib/types';

const STATUSES: { value: TenantStatus; label: string; note: string }[] = [
  { value: 'TRIAL', label: 'Trial', note: 'Full access while they evaluate' },
  { value: 'ACTIVE', label: 'Active', note: 'Paying customer' },
  { value: 'PAST_DUE', label: 'Past due', note: 'Still usable — a nudge, not a lockout' },
  { value: 'SUSPENDED', label: 'Suspended', note: 'Staff cannot sign in; data is kept' },
  { value: 'CANCELLED', label: 'Cancelled', note: 'Account closed' },
];

export function TenantActions({
  tenantId,
  status,
  plans,
}: {
  tenantId: string;
  status: TenantStatus;
  plans: Plan[];
}) {
  const router = useRouter();
  const toast = useToast();

  const [statusOpen, setStatusOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [nextStatus, setNextStatus] = useState<TenantStatus>(status);
  const [planForm, setPlanForm] = useState({ planCode: plans[0]?.code ?? '', months: 1, amount: 0 });

  const selectedPlan = plans.find((plan) => plan.code === planForm.planCode);
  const suggested = selectedPlan ? Number(selectedPlan.pricePerMonth) * planForm.months : 0;

  async function saveStatus() {
    setBusy(true);
    try {
      await apiPatch(`platform/tenants/${tenantId}/status`, { status: nextStatus });
      toast.success('Status updated');
      setStatusOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function savePlan() {
    setBusy(true);
    try {
      await apiPost(`platform/tenants/${tenantId}/plan`, {
        planCode: planForm.planCode,
        months: planForm.months,
        amount: planForm.amount > 0 ? planForm.amount : undefined,
      });
      toast.success('Subscription recorded');
      setPlanOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setStatusOpen(true)}>
        <ShieldAlert className="h-4 w-4" />
        Change status
      </Button>
      <Button onClick={() => setPlanOpen(true)}>
        <CreditCard className="h-4 w-4" />
        Record payment
      </Button>

      <Modal
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        title="Change account status"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setStatusOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant={nextStatus === 'SUSPENDED' || nextStatus === 'CANCELLED' ? 'danger' : 'primary'}
              onClick={saveStatus}
              loading={busy}
            >
              Apply
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          {STATUSES.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                nextStatus === option.value ? 'border-brand-300 bg-brand-50' : 'border-stone-200'
              }`}
            >
              <input
                type="radio"
                name="status"
                value={option.value}
                checked={nextStatus === option.value}
                onChange={() => setNextStatus(option.value)}
                className="mt-0.5 h-4 w-4 text-brand-600"
              />
              <span>
                <span className="block text-sm font-medium text-ink">{option.label}</span>
                <span className="block text-xs text-ink-muted">{option.note}</span>
              </span>
            </label>
          ))}
        </div>
      </Modal>

      <Modal
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        title="Record a subscription payment"
        description="Money is collected off-platform — bank transfer, UPI or cheque. This records what was received."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPlanOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={savePlan} loading={busy}>
              Record
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Plan" required>
            {({ id }) => (
              <Select id={id} value={planForm.planCode} onChange={(e) => setPlanForm((f) => ({ ...f, planCode: e.target.value }))}>
                {plans.map((plan) => (
                  <option key={plan.code} value={plan.code}>
                    {plan.name} — {money(plan.pricePerMonth)}/month
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Months paid for" required>
            {({ id }) => (
              <Input
                id={id}
                type="number"
                min={1}
                max={36}
                value={planForm.months}
                onChange={(e) => setPlanForm((f) => ({ ...f, months: Number(e.target.value) }))}
                className="tnum text-right"
              />
            )}
          </Field>

          <Field label="Amount received (₹)" hint={`Leave blank to use ${money(suggested)}`}>
            {({ id }) => (
              <Input
                id={id}
                type="number"
                value={planForm.amount || ''}
                onChange={(e) => setPlanForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                placeholder={String(suggested)}
                className="tnum text-right"
              />
            )}
          </Field>

          <p className="rounded-lg bg-stone-50 p-3 text-2xs leading-relaxed text-ink-muted">
            Recording a payment sets the salon to <strong>Active</strong> and extends the period end date.
          </p>
        </div>
      </Modal>
    </>
  );
}
