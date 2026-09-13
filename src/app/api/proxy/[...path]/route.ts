import { NextResponse, type NextRequest } from 'next/server';
import { API_URL } from '@/lib/api';
import { getPlatformToken } from '@/lib/session';

/** Attaches the platform token server-side so it never reaches the browser. */
async function forward(request: NextRequest, path: string[]): Promise<NextResponse> {
  const target = new URL(`${API_URL}/${path.join('/')}`);
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.set(key, value));

  const token = await getPlatformToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const tenantId = request.headers.get('x-tenant-id');
  if (tenantId) headers['X-Tenant-Id'] = tenantId;

  const contentType = request.headers.get('content-type');
  if (contentType) headers['Content-Type'] = contentType;

  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text();

  const response = await fetch(target.toString(), { method: request.method, headers, body, cache: 'no-store' });
  const text = await response.text();

  return new NextResponse(text, {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json' },
  });
}

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: Context) {
  return forward(request, (await context.params).path);
}
export async function POST(request: NextRequest, context: Context) {
  return forward(request, (await context.params).path);
}
export async function PATCH(request: NextRequest, context: Context) {
  return forward(request, (await context.params).path);
}
export async function PUT(request: NextRequest, context: Context) {
  return forward(request, (await context.params).path);
}
export async function DELETE(request: NextRequest, context: Context) {
  return forward(request, (await context.params).path);
}
