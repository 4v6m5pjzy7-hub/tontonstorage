import { getSupabase, supabaseConfigured } from '../../../lib/supabase.js';
import { requireAuth } from '../../auth.js';
import { whiskeyStatementPreview } from '../../../lib/email.js';
import { monthKey, monthLabel } from '../../../lib/format.js';

export const dynamic = 'force-dynamic';

// Provider-only preview of the exact combined statement email Marc would get
// for the current month's active spots.
export async function GET() {
  requireAuth();
  if (!supabaseConfigured()) return new Response('Not configured', { status: 500 });
  const sb = getSupabase();
  const { data: spots = [] } = await sb
    .from('whiskey_rentals').select('*').eq('active', true).order('name');
  const { html } = await whiskeyStatementPreview(spots, monthLabel(monthKey()));
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
