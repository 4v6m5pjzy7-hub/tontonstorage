import { getSupabase, supabaseConfigured } from '../../../lib/supabase.js';
import { renderAddendum } from '../../../lib/documents.js';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  if (!supabaseConfigured()) return new Response('Not configured', { status: 500 });
  const sb = getSupabase();
  const { data: r } = await sb.from('rentals').select('*').eq('id', params.id).single();
  if (!r) return new Response('Not found', { status: 404 });
  if (!r.extension) return new Response('No extension has been set for this rental yet.', { status: 400 });
  return new Response(renderAddendum(r), { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
