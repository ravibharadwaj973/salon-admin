'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, NotebookPen } from 'lucide-react';
import { apiPatch, errorMessage } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/display';
import { Textarea } from '@/components/ui/form';
import { useToast } from '@/components/ui/overlay';
import { cn } from '@/lib/cn';
import { ENQUIRY_STAGES } from '@/lib/types';
import type { Enquiry, EnquiryStatus } from '@/lib/types';

/**
 * Where an enquiry gets moved along, and where the call gets written down.
 *
 * The stages are buttons rather than a dropdown because this is used with a
 * phone against one ear — and they are not a wizard: you can drop one back to
 * "contacted" after a demo that went nowhere, or straight to "lost". Only WON
 * is withheld, because winning one means creating the salon, which happens in
 * the onboarding form next door.
 */
export function EnquiryActions({ enquiry }: { enquiry: Enquiry }) {
  const router = useRouter();
  const toast = useToast();

  const [status, setStatus] = useState<EnquiryStatus>(enquiry.status);
  const [notes, setNotes] = useState(enquiry.notes ?? '');
  const [savingStage, setSavingStage] = useState<EnquiryStatus | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);

  const notesDirty = notes !== (enquiry.notes ?? '');
  const won = enquiry.status === 'WON';

  async function moveTo(next: EnquiryStatus) {
    if (next === status) return;
    setSavingStage(next);
    const previous = status;
    setStatus(next);

    try {
      await apiPatch(`platform/enquiries/${enquiry.id}`, { status: next });
      toast.success(`Moved to ${ENQUIRY_STAGES.find((s) => s.status === next)?.label ?? next}`);
      router.refresh();
    } catch (error) {
      setStatus(previous);
      toast.error(errorMessage(error));
    } finally {
      setSavingStage(null);
    }
  }

  async function saveNotes() {
    setSavingNotes(true);
    try {
      await apiPatch(`platform/enquiries/${enquiry.id}`, { notes });
      toast.success('Saved');
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSavingNotes(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader
          title="Where are we with them?"
          subtitle={won ? 'Won — this enquiry became a salon' : 'Move it along after the call'}
        />
        <CardBody>
          <div className="grid gap-2 sm:grid-cols-2">
            {ENQUIRY_STAGES.filter((stage) => stage.status !== 'WON' || won).map((stage) => {
              const active = status === stage.status;
              const busy = savingStage === stage.status;
              const locked = stage.status === 'WON';

              return (
                <button
                  key={stage.status}
                  type="button"
                  disabled={busy || locked || savingStage !== null}
                  onClick={() => moveTo(stage.status)}
                  className={cn(
                    'flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors',
                    active
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50',
                    (busy || savingStage !== null) && !active && 'opacity-60',
                    locked && 'cursor-default',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                      active ? 'border-white bg-white' : 'border-stone-300',
                    )}
                  >
                    {active ? <Check className="h-3 w-3 text-stone-900" /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className={cn('block text-sm font-medium', active ? 'text-white' : 'text-ink')}>
                      {stage.label}
                    </span>
                    <span className={cn('block text-2xs', active ? 'text-stone-400' : 'text-ink-subtle')}>
                      {stage.blurb}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {!won ? (
            <p className="mt-3 text-2xs leading-relaxed text-ink-subtle">
              &ldquo;Won&rdquo; is set for you when you create the salon — there is no way to mark an enquiry won
              without one, so the number on the overview always means a paying business exists.
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Call notes"
          subtitle="What was said, what they asked for, what you promised"
          action={<NotebookPen className="h-4 w-4 text-ink-subtle" />}
        />
        <CardBody className="space-y-3">
          <Textarea
            rows={6}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={'14 Sep — spoke to Ritu. Two chairs, moving off a notebook.\nWants WhatsApp reminders. Ringing back Thursday.'}
          />
          <div className="flex items-center justify-end gap-3">
            {notesDirty ? <span className="text-2xs text-ink-subtle">Unsaved</span> : null}
            <Button onClick={saveNotes} loading={savingNotes} disabled={!notesDirty}>
              Save notes
            </Button>
          </div>
        </CardBody>
      </Card>
    </>
  );
}
