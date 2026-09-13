import { NextResponse } from 'next/server';
import { clearPlatformToken } from '@/lib/session';

export async function POST() {
  await clearPlatformToken();
  return NextResponse.json({ ok: true });
}
