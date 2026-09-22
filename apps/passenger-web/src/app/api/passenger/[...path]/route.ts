import { NextRequest } from 'next/server';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/server-api';
import { sessionResponse } from '@/lib/server-auth';

export const runtime = 'nodejs';

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const { path } = await context.params;
  if (path[0] === 'auth') {
    if (request.method === 'GET' && path.length === 2 && path[1] === 'me')
      return sessionResponse(token);
    return Response.json({ message: 'Endpoint bulunamadı.' }, { status: 404 });
  }
  if (!token) {
    return Response.json({ message: 'Oturum açmanız gerekiyor.' }, { status: 401 });
  }

  const headers = new Headers();
  headers.set('Authorization', `Bearer ${token}`);
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const upstream = await fetch(`${API_BASE_URL}/${path.join('/')}${request.nextUrl.search}`, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: 'no-store',
  });
  const responseHeaders = new Headers();
  const upstreamContentType = upstream.headers.get('content-type');
  if (upstreamContentType) responseHeaders.set('Content-Type', upstreamContentType);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const DELETE = proxy;
