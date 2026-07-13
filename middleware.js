import { NextResponse } from 'next/server';

// Password-gates the provider/admin area. Public routes stay open.
// (Temporary try/catch surfaces the real error text to diagnose a Vercel Edge 500.)

const PUBLIC_PREFIXES = ['/intake', '/renew', '/addendum', '/login', '/api', '/_next', '/favicon', '/logo'];

export function middleware(req) {
  try {
    const pw = process.env.ADMIN_PASSWORD;
    if (!pw) return NextResponse.next();

    const { pathname } = req.nextUrl;
    if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }

    if (req.cookies.get('tt_admin')?.value === pw) {
      return NextResponse.next();
    }

    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  } catch (e) {
    return new NextResponse('MW_ERR: ' + (e && e.message ? e.message : String(e)), {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    });
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png).*)'],
};
