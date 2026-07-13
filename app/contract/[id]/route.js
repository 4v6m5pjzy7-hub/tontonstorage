import { getSupabase, supabaseConfigured } from '../../../lib/supabase.js';
import { renderContract } from '../../../lib/documents.js';
import { requireAuth } from '../../auth.js';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  requireAuth();
  if (!supabaseConfigured()) return new Response('Not configured', { status: 500 });
  const sb = getSupabase();
  const { data: r } = await sb.from('rentals').select('*').eq('id', params.id).single();
  if (!r) return new Response('Not found', { status: 404 });
  if (!r.client) return new Response('Client info not submitted yet.', { status: 400 });
  return new Response(renderContract(r), { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
