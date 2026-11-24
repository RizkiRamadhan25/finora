import { NextResponse, type NextRequest } from 'next/server';
import { isLocalHost } from '@/server/local-request';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  if (!isLocalHost(host)) return new NextResponse('Finora is available on localhost only.', { status: 403 });

  const origin = request.headers.get('origin');
  if (request.method !== 'GET' && request.method !== 'HEAD' && origin && origin !== `http://${host}`) {
    return new NextResponse(null, { status: 403 });
  }
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

// The restore route checks host and origin directly and reads the full backup body.
export const config = { matcher: '/((?!api/restore).*)' };
