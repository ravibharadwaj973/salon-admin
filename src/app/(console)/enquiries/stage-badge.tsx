import { Badge } from '@/components/ui/display';
import { ENQUIRY_STAGES } from '@/lib/types';
import type { EnquiryStatus } from '@/lib/types';

const STAGE_TONES = {
  NEW: 'warning',
  CONTACTED: 'info',
  DEMO_BOOKED: 'brand',
  TRIAL_STARTED: 'brand',
  WON: 'success',
  LOST: 'neutral',
} as const;

export function StageBadge({ status }: { status: EnquiryStatus }) {
  const stage = ENQUIRY_STAGES.find((item) => item.status === status);
  return <Badge tone={STAGE_TONES[status]}>{stage?.label ?? status}</Badge>;
}
