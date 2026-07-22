import { getSupabase, supabaseConfigured } from '../../../../lib/supabase.js';
import { sendRenewalNotice, sendWhiskeyStatement } from '../../../../lib/email.js';
import { daysUntil, monthKey, monthLabel } from '../../../../lib/format.js';

// Send Marc his combined Whiskey statement if today is the configured send day
// and it hasn't already gone out this month. Runs inside the daily cron.
async function runWhiskeyStatement(sb) {
  const { data: settings } = await sb.from('whiskey_settings').select('*').eq('id', 1).maybeSingle();
  if (!settings?.reminders_enabled || !settings.marc_email) return { skipped: 'off or no email' };
  if (new Date().getDate() !== Number(settings.send_day)) return { skipped: 'not send day' };

  const month = monthKey();
  const { data: already } = await sb
    .from('whiskey_statements').select('id').eq('month', month).eq('status', 'sent').limit(1);
  if (already?.length) return { skipped: 'already sent this month' };

  const { data: spots = [] } = await sb.from('whiskey_rentals').select('*').eq('active', true).order('name');
  if (spots.length === 0) return { skipped: 'no active spots' };

  let status = 'sent', errMsg = null, total = 0;
  try {
    const res = await sendWhiskeyStatement(spots, monthLabel(month), settings.marc_email);
    total = res.total;
  } catch (e) {
    status = 'failed';
    errMsg = String(e.message || e);
  }
  await sb.from('whiskey_statements').insert({
    month, to_email: settings.marc_email, status, total, spot_count: spots.length, auto: true, error: errMsg,
  });
  return { sent: status === 'sent', total, spots: spots.length };
}

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

  // Purge rentals deleted more than 30 days ago.
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: purged } = await sb
    .from('rentals')
    .delete()
    .lt('deleted_at', cutoff)
    .select('id');

  const { data: rentals = [], error } = await sb
    .from('rentals')
    .select('*')
    .eq('status', 'active')
    .is('deleted_at', null)
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

  let whiskey = null;
  try {
    whiskey = await runWhiskeyStatement(sb);
  } catch (e) {
    whiskey = { error: String(e.message || e) };
  }

  return Response.json({ checked: rentals.length, notified, purged: purged?.length || 0, whiskey });
}
