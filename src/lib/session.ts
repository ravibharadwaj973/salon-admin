import 'server-only';
import { cookies } from 'next/headers';

/**
 * Platform tokens are short-lived (8 hours) and there is no refresh token — an
 * operator console should ask for the password again rather than stay open
 * indefinitely.
 */
export const PLATFORM_COOKIE = 'sos_pat';
const MAX_AGE = 8 * 60 * 60;

const secure = process.env.NODE_ENV === 'production';

export async function getPlatformToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(PLATFORM_COOKIE)?.value ?? null;
}

export async function setPlatformToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(PLATFORM_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function clearPlatformToken(): Promise<void> {
  const store = await cookies();
  store.delete(PLATFORM_COOKIE);
}
