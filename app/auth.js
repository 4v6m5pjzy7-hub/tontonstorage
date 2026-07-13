import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// Node-runtime auth gate (replaces Edge middleware, which fails on Vercel).
// Call at the top of any provider-only page, route handler, or server action.
// If ADMIN_PASSWORD is unset, the gate is off.
export function requireAuth() {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return;
  if (cookies().get('tt_admin')?.value === pw) return;
  redirect('/login');
}
