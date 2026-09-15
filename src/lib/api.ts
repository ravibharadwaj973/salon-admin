import 'server-only';
import { getPlatformToken } from './session';
import type { ApiErrorBody, Envelope, PageMeta } from './types';

export const API_URL = process.env.API_URL ?? 'https://api.jharavi.in/api/v1';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiRequest {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Act inside a tenant (the API accepts X-Tenant-Id from platform tokens). */
  tenantId?: string;
}

function buildUrl(path: string, query?: ApiRequest['query']): string {
  const url = new URL(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function call<T>(path: string, options: ApiRequest = {}): Promise<{ data: T; meta?: PageMeta }> {
  const token = await getPlatformToken();

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.tenantId) headers['X-Tenant-Id'] = options.tenantId;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as Envelope<T> | ApiErrorBody) : null;

  if (!response.ok || (payload && 'success' in payload && payload.success === false)) {
    const error = (payload as ApiErrorBody | null)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'REQUEST_FAILED',
      error?.message ?? `Request to ${path} failed (${response.status})`,
      error?.details,
    );
  }

  const envelope = payload as Envelope<T>;
  return { data: envelope?.data as T, meta: envelope?.meta };
}

export async function apiFetch<T>(path: string, options: ApiRequest = {}): Promise<T> {
  return (await call<T>(path, options)).data;
}

export async function apiFetchSafe<T>(path: string, options: ApiRequest = {}): Promise<T | null> {
  try {
    return await apiFetch<T>(path, options);
  } catch {
    return null;
  }
}

export async function apiFetchList<T>(
  path: string,
  options: ApiRequest = {},
): Promise<{ data: T[]; meta: PageMeta }> {
  const result = await call<T[]>(path, options);
  return {
    data: result.data ?? [],
    meta: result.meta ?? { page: 1, pageSize: 25, total: result.data?.length ?? 0, totalPages: 1, hasMore: false },
  };
}
