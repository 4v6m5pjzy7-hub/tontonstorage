import { getSupabase, supabaseConfigured } from '../../../lib/supabase.js';
import { renderContract } from '../../../lib/documents.js';

export const dynamic = 'force-dynamic';

// Customer-facing copy of their own agreement, reachable only with their
// private token. Public on purpose so they can read it before signing and
// keep/print it afterwards.
export async function GET(request, { params }) {
  if (!supabaseConfigured()) return new Response('Not configured', { status: 500 });
  const sb = getSupabase();
  const { data: r } = await sb.from('rentals').select('*').eq('token', params.token).is('deleted_at', null).single();
  if (!r) return new Response('Not found', { status: 404 });
  if (!r.client || !r.terms?.monthlyFee) {
    return new Response('This agreement is not ready yet.', { status: 400 });
  }
  return new Response(renderContract(r), {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
