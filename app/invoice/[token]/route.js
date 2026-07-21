import { getSupabase, supabaseConfigured } from '../../../lib/supabase.js';
import { renderInvoice } from '../../../lib/invoice.js';

export const dynamic = 'force-dynamic';

// Customer-facing invoice, reachable with the invoice's private token so they
// can view and print it without logging in.
export async function GET(request, { params }) {
  if (!supabaseConfigured()) return new Response('Not configured', { status: 500 });
  const sb = getSupabase();
  const { data: inv } = await sb.from('invoices').select('*').eq('token', params.token).single();
  if (!inv) return new Response('Not found', { status: 404 });
  return new Response(renderInvoice(inv), {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
