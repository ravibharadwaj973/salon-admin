'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { apiPost, errorMessage } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/overlay';

/**
 * Sends today's reminders now instead of waiting for the 08:00 sweep.
 *
 * Safe to press twice: each salon is marked as reminded per milestone before
 * the send is attempted, so a second press finds nothing left to do rather
 * than mailing anyone again.
 */
export function SendRemindersButton() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    try {
      const result = await apiPost<{ due: number; sent: number; skipped: number }>(
        'platform/renewals/send-reminders',
      );
      toast.success(
        result.sent === 0
          ? `Nothing to send — ${result.skipped} already reminded today`
          : `${result.sent} reminder${result.sent === 1 ? '' : 's'} sent`,
      );
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="secondary" onClick={send} loading={busy}>
      <Send className="h-4 w-4" />
      Send today&rsquo;s reminders
    </Button>
  );
}
