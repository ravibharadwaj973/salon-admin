'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus } from 'lucide-react';
import { apiPatch, apiPost, ClientApiError, errorMessage } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, CardHeader, EmptyState } from '@/components/ui/display';
import { Checkbox, Field, Input, Select } from '@/components/ui/form';
import { Modal, useToast } from '@/components/ui/overlay';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { count, money } from '@/lib/format';
import { METER_LABELS, type CreditPack, type MeterKey } from '@/lib/types';

const METERS: MeterKey[] = ['WA_UTILITY', 'WA_MARKETING', 'WA_AUTHENTICATION', 'SMS', 'EMAIL'];

interface PackForm {
  code: string;
  name: string;
  meter: MeterKey;
  quantity: string;
  price: string;
  sortOrder: string;
  isActive: boolean;
}

const BLANK: PackForm = {
  code: '',
  name: '',
  meter: 'WA_UTILITY',
  quantity: '1000',
  price: '300',
  sortOrder: '1',
  isActive: true,
};

export function PacksManager({ initialPacks }: { initialPacks: CreditPack[] }) {
  const router = useRouter();
  const toast = useToast();

  const [editing, setEditing] = useState<CreditPack | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<PackForm>(BLANK);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const open = creating || editing !== null;
  const set = <K extends keyof PackForm>(k: K, v: PackForm[K]) => setForm((p) => ({ ...p, [k]: v }));

  const perMessage = Number(form.quantity) > 0 ? Number(form.price) / Number(form.quantity) : 0;

  function startCreate() {
    setForm(BLANK);
    setFieldErrors({});
    setEditing(null);
    setCreating(true);
  }

  function startEdit(pack: CreditPack) {
    setForm({
      code: pack.code,
      name: pack.name,
      meter: pack.meter,
      quantity: String(pack.quantity),
      price: String(pack.price),
      sortOrder: String(pack.sortOrder),
      isActive: pack.isActive,
    });
    setFieldErrors({});
    setCreating(false);
    setEditing(pack);
  }

  function close() {
    setCreating(false);
    setEditing(null);
  }

  async function save() {
    setBusy(true);
    setFieldErrors({});
    const payload = {
      code: form.code,
      name: form.name,
      meter: form.meter,
      quantity: Number(form.quantity || 0),
      price: Number(form.price || 0),
      sortOrder: Number(form.sortOrder || 0),
    };

    try {
      if (editing) {
        const { code: _code, ...rest } = payload;
        await apiPatch(`platform/packs/${editing.id}`, { ...rest, isActive: form.isActive });
        toast.success('Pack updated');
      } else {
        await apiPost('platform/packs', payload);
        toast.success('Pack created');
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

  const byMeter = METERS.map((meter) => ({
    meter,
    packs: initialPacks.filter((p) => p.meter === meter),
  })).filter((group) => group.packs.length > 0);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={startCreate}>
          <Plus className="h-4 w-4" />
          New pack
        </Button>
      </div>

      {initialPacks.length === 0 ? (
        <EmptyState
          title="No add-on packs"
          description="Without packs, a salon that exhausts its allowance simply stops sending until the 1st."
          action={<Button onClick={startCreate}>Create the first pack</Button>}
        />
      ) : (
        <div className="space-y-5">
          {byMeter.map(({ meter, packs }) => (
            <Card key={meter}>
              <CardHeader title={METER_LABELS[meter]} subtitle={`${packs.length} pack${packs.length === 1 ? '' : 's'}`} />
              <CardBody className="p-0">
                <Table>
                  <THead>
                    <TR>
                      <TH>Pack</TH>
                      <TH align="right">Messages</TH>
                      <TH align="right">Price</TH>
                      <TH align="right">Per message</TH>
                      <TH align="right">Edit</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {packs.map((pack) => (
                      <TR key={pack.id} className={pack.isActive ? undefined : 'opacity-55'}>
                        <TD>
                          <span className="flex items-center gap-2">
                            <span className="font-medium text-ink">{pack.name}</span>
                            {pack.isActive ? null : <Badge tone="neutral">Off</Badge>}
                          </span>
                          <span className="block font-mono text-2xs text-ink-subtle">{pack.code}</span>
                        </TD>
                        <TD align="right" className="tnum">{count(pack.quantity)}</TD>
                        <TD align="right" className="tnum">{money(pack.price)}</TD>
                        <TD align="right" className="tnum text-ink-muted">
                          ₹{(Number(pack.price) / pack.quantity).toFixed(2)}
                        </TD>
                        <TD align="right">
                          <Button variant="ghost" size="icon" onClick={() => startEdit(pack)} aria-label={`Edit ${pack.name}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={close}
        title={editing ? `Edit ${editing.name}` : 'New add-on pack'}
        description="Salons pay you by UPI or transfer, then you record the top-up on their page. Nothing is charged automatically."
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={save} loading={busy}>
              {editing ? 'Save changes' : 'Create pack'}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code" required error={fieldErrors.code} hint={editing ? 'Cannot be changed' : 'e.g. WA_UTIL_1K'}>
            {({ id }) => (
              <Input
                id={id}
                value={form.code}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
                disabled={editing !== null}
                placeholder="WA_UTIL_1K"
                className="font-mono text-xs uppercase"
              />
            )}
          </Field>

          <Field label="Name" required error={fieldErrors.name}>
            {({ id }) => (
              <Input id={id} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="1,000 WhatsApp utility" />
            )}
          </Field>

          <Field label="Meter" required error={fieldErrors.meter} hint={editing ? 'Changing this re-points existing credits' : undefined}>
            {({ id }) => (
              <Select id={id} value={form.meter} onChange={(e) => set('meter', e.target.value as MeterKey)}>
                {METERS.map((m) => (
                  <option key={m} value={m}>
                    {METER_LABELS[m]}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Sort order" hint="Lowest first" error={fieldErrors.sortOrder}>
            {({ id }) => (
              <Input id={id} type="number" min={0} value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} className="tnum text-right" />
            )}
          </Field>

          <Field label="Messages" required error={fieldErrors.quantity}>
            {({ id }) => (
              <Input id={id} type="number" min={1} value={form.quantity} onChange={(e) => set('quantity', e.target.value)} className="tnum text-right" />
            )}
          </Field>

          <Field label="Price (₹)" required error={fieldErrors.price}>
            {({ id }) => (
              <Input id={id} type="number" min={0} value={form.price} onChange={(e) => set('price', e.target.value)} className="tnum text-right" />
            )}
          </Field>

          <p className="tnum sm:col-span-2 rounded-lg bg-stone-50 p-3 text-2xs leading-relaxed text-ink-muted">
            That works out to <strong className="font-medium text-ink">₹{perMessage.toFixed(2)}</strong> per message.
            {form.meter === 'WA_MARKETING'
              ? ' WhatsApp marketing costs about ₹0.86 each, so anything below that loses money on every send.'
              : form.meter === 'WA_UTILITY'
                ? ' WhatsApp utility costs about ₹0.115 each.'
                : ''}
          </p>

          {editing ? (
            <div className="sm:col-span-2 border-t border-stone-100 pt-3">
              <Checkbox
                checked={form.isActive}
                onChange={(e) => set('isActive', e.target.checked)}
                label="Offer this pack to salons"
                description="Turning it off hides the pack. Credits already bought are unaffected."
              />
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
