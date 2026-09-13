import { NextResponse } from 'next/server';
import { z } from 'zod';
import { API_URL } from '@/lib/api';
import { setPlatformToken } from '@/lib/session';
import type { PlatformUser } from '@/lib/types';

const bodySchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Enter a valid email and password' } },
      { status: 422 },
    );
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}/auth/platform/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { error: { code: 'API_UNREACHABLE', message: 'Cannot reach the API. Is the backend running?' } },
      { status: 503 },
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | { data: { accessToken: string; user: PlatformUser } }
    | { error: { code: string; message: string } }
    | null;

  if (!response.ok || !payload || 'error' in payload) {
    const error = payload && 'error' in payload ? payload.error : null;
    return NextResponse.json(
      { error: error ?? { code: 'LOGIN_FAILED', message: 'Could not sign you in' } },
      { status: response.status || 401 },
    );
  }

  await setPlatformToken(payload.data.accessToken);
  return NextResponse.json({ user: payload.data.user });
}
