import { NextResponse } from 'next/server';

// Password-gates the provider/admin area. Public routes (client intake, tenant
// renewal, the emailed addendum, the login page, API, and static assets) stay open.
// If ADMIN_PASSWORD is not set, the gate is off (nothing is blocked).

const PUBLIC_PREFIXES = ['/intake', '/renew', '/addendum', '/login', '/api', '/_next', '/favicon', '/logo'];

export function middleware(req) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (req.cookies.get('tt_admin')?.value === pw) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png).*)'],
};
