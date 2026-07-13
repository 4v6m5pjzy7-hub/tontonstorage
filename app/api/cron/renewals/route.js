import { getSupabase, supabaseConfigured } from '../../../../lib/supabase.js';
import { sendRenewalNotice } from '../../../../lib/email.js';
import { daysUntil } from '../../../../lib/format.js';

export const dynamic = 'force-dynamic';

// Runs daily (Vercel Cron, see vercel.json). Finds active fixed-term rentals whose
// end date is within 30 days and that haven't been notified yet, then emails the
// tenant a renewal notice with extend/vacate options.
export async function GET(request) {
  // Protect the endpoint. Vercel sends "Authorization: Bearer <CRON_SECRET>".
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }
  }
  if (!supabaseConfigured()) return Response.json({ error: 'not configured' }, { status: 500 });

  const sb = getSupabase();
  const { data: rentals = [], error } = await sb
    .from('rentals')
    .select('*')
    .eq('status', 'active')
    .is('renewal_notified_at', null);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const notified = [];
  for (const r of rentals) {
    const end = r.terms?.endDate;
    if (!end) continue; // month-to-month has no fixed end
    const d = daysUntil(end);
    if (d === null || d < 0 || d > 30) continue;
    if (!r.client?.email) continue;

    try {
      await sendRenewalNotice(r);
      await sb
        .from('rentals')
        .update({ status: 'renewal_notified', renewal_notified_at: new Date().toISOString() })
        .eq('id', r.id);
      notified.push({ id: r.id, name: r.client?.name, daysLeft: d });
    } catch (e) {
      notified.push({ id: r.id, error: String(e.message || e) });
    }
  }

  return Response.json({ checked: rentals.length, notified });
}
