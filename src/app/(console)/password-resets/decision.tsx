'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { apiPost, errorMessage } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Field, Textarea } from '@/components/ui/form';
import { Modal, useToast } from '@/components/ui/overlay';

/**
 * APPROVING — OR REFUSING — A LOCKED-OUT OWNER.
 *
 * ── What approving does, and what it deliberately does not ─────────────
 *
 * It sends a single-use link to the address ALREADY ON THE ACCOUNT. It does not
 * set a password and it does not show one here. The owner chooses their own, in
 * their own browser, after proving they can read that mailbox.
 *
 * That boundary is worth defending against the obvious "simpler" alternative of
 * typing a password and reading it down the phone. The moment support can hand
 * over a working credential, every support conversation becomes a target worth
 * social-engineering, and a salon has to trust us in a way it should not have
 * to. Here the worst a mistaken approval can do is post a reset link to an
 * address the real owner controls.
 *
 * ── Why the reason box cannot be skipped ───────────────────────────────
 *
 * The identity check happens off this screen — a call to the number on the
 * account, a conversation with a contact somebody already knows. This box is the
 * only record that it happened, and it is written for the person reading it in
 * six months, not for the person typing it now. Twenty characters is roughly
 * "called Ravi on the salon number"; "verified" is what a field collects when it
 * lets you.
 */
export function ResetDecision({
  requestId,
  name,
  email,
  salonName,
}: {
  requestId: string;
  name: string;
  email: string;
  salonName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const tooShort = reason.trim().length < 20;

  function close() {
    setOpen(null);
    setReason('');
  }

  async function submit() {
    if (!open || tooShort) return;
    setBusy(true);
    try {
      const result = await apiPost<{ message?: string }>(
        `platform/password-requests/${requestId}/${open}`,
        { reason: reason.trim() },
      );
      /**
       * The server's own words, not a generic success.
       *
       * An approval whose email failed to send is still an approval — the link
       * exists and the request is closed — and the person here has to know to
       * chase it rather than press approve again, which would cancel the link
       * just issued. Only the server knows which happened.
       */
      toast.success(result.message ?? (open === 'approve' ? 'Reset link sent' : 'Request refused'));
      close();
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <span className="flex items-center justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={() => setOpen('reject')}>
          <X className="h-3.5 w-3.5" />
          Refuse
        </Button>
        <Button size="sm" onClick={() => setOpen('approve')}>
          <Check className="h-3.5 w-3.5" />
          Send reset link
        </Button>
      </span>

      <Modal
        open={open !== null}
        onClose={close}
        title={open === 'approve' ? `Send a reset link to ${name}?` : `Refuse this request?`}
        description={
          open === 'approve'
            ? `A single-use link goes to ${email} — the address on the account. It expires in two hours and signs them out everywhere when used.`
            : 'Use this when you could not verify who was asking. The salon sees the refusal in their own activity log.'
        }
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submit} loading={busy} disabled={tooShort}>
              {open === 'approve' ? 'Send the link' : 'Refuse'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {open === 'approve' ? (
            <p className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
              {/* Named explicitly, because the one way this goes badly wrong is
                  somebody approving on the requester's own say-so. The details
                  to check against are on the row behind this dialog. */}
              Check who you are speaking to against the salon’s own contact details for {salonName} — not against
              anything the person asking has told you.
            </p>
          ) : null}

          <Field
            label="How did you verify them?"
            hint="A name, a number you called, or what was checked. This is the only record of it."
            required
          >
            {({ id }) => (
              <Textarea
                id={id}
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Called the salon landline on file and spoke to…"
                autoFocus
              />
            )}
          </Field>

          {tooShort && reason.length > 0 ? (
            <p className="text-2xs text-ink-subtle">A few more words — this is read by somebody who was not here.</p>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
