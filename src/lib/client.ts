'use client';

import type { ApiErrorBody, Envelope, PageMeta } from './types';

export class ClientApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ClientApiError';
  }
}

interface ClientRequest {
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  tenantId?: string;
}

function toUrl(path: string, query?: ClientRequest['query']): string {
  const clean = path.startsWith('/') ? path.slice(1) : path;
  const url = new URL(`/api/proxy/${clean}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function request<T>(method: string, path: string, options: ClientRequest = {}) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.tenantId) headers['X-Tenant-Id'] = options.tenantId;

  const response = await fetch(toUrl(path, options.query), {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (response.status === 204) return { data: undefined as T };

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as Envelope<T> | ApiErrorBody) : null;

  if (!response.ok || (payload && 'success' in payload && payload.success === false)) {
    const error = (payload as ApiErrorBody | null)?.error;

    if (response.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login';
    }

    throw new ClientApiError(
      response.status,
      error?.code ?? 'REQUEST_FAILED',
      error?.message ?? 'Something went wrong.',
      error?.details,
    );
  }

  const envelope = payload as Envelope<T>;
  return { data: envelope.data, meta: envelope.meta as PageMeta | undefined };
}

export async function apiGet<T>(path: string, options?: ClientRequest): Promise<T> {
  return (await request<T>('GET', path, options)).data;
}

export async function apiPost<T>(path: string, body?: unknown, options?: ClientRequest): Promise<T> {
  return (await request<T>('POST', path, { ...options, body })).data;
}

export async function apiPatch<T>(path: string, body?: unknown, options?: ClientRequest): Promise<T> {
  return (await request<T>('PATCH', path, { ...options, body })).data;
}

export async function apiDelete<T>(path: string, options?: ClientRequest): Promise<T> {
  return (await request<T>('DELETE', path, options)).data;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ClientApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
