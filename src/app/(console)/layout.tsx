import { redirect } from 'next/navigation';
import { ConsoleShell } from '@/components/layout/console-shell';
import { apiFetch } from '@/lib/api';
import type { PlatformStats } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  // There is no /me for platform tokens, so the stats call doubles as the
  // "is this token still good?" check.
  try {
    await apiFetch<PlatformStats>('/platform/stats');
  } catch {
    redirect('/login');
  }

  return <ConsoleShell operator="Platform operator">{children}</ConsoleShell>;
}
