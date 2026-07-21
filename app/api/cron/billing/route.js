import { getSupabase, supabaseConfigured } from '../../../../lib/supabase.js';
import { sendPaymentReminder } from '../../../../lib/email.js';
import { monthKey, monthLabel, daysUntil } from '../../../../lib/format.js';

export const dynamic = 'force-dynamic';

// Runs on the 1st of each month (Vercel Cron, see vercel.json).
// Emails every active tenant what they owe for the month.
// Prepaid tenants are skipped - they already paid the whole term up front.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }
  }
  if (!supabaseConfigured()) return Response.json({ error: 'not configured' }, { status: 500 });

  const sb = getSupabase();
  const { data: rentals = [], error } = await sb.from('rentals').select('*');
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // ?dry=1 reports who would be billed without sending anything.
  const dry = new URL(request.url).searchParams.get('dry') === '1';
  const month = monthKey();
  const label = monthLabel(month);
  const sent = [];
  const skipped = [];

  for (const r of rentals) {
    const t = r.terms || {};
    const email = r.client?.email;
    const who = r.client?.name || r.id;

    if (!email || !t.monthlyFee) { skipped.push({ who, why: 'no email or rate' }); continue; }
    if (t.paymentSchedule === 'prepaid') { skipped.push({ who, why: 'prepaid' }); continue; }
    if (['vacating', 'expired'].includes(r.status)) { skipped.push({ who, why: r.status }); continue; }
    // Term already finished
    if (t.endDate && daysUntil(t.endDate) < 0) { skipped.push({ who, why: 'term ended' }); continue; }
    // Not started yet
    if (t.termStart && daysUntil(t.termStart) > 0) { skipped.push({ who, why: 'not started' }); continue; }
    // Already reminded this month
    if (t.billingReminders?.[month]) { skipped.push({ who, why: 'already sent' }); continue; }

    if (dry) { sent.push(`${who} (dry run, ${t.monthlyFee})`); continue; }

    try {
      await sendPaymentReminder(r, label);
      const terms = {
        ...t,
        billingReminders: { ...(t.billingReminders || {}), [month]: new Date().toISOString() },
      };
      await sb.from('rentals').update({ terms }).eq('id', r.id);
      sent.push(who);
    } catch (e) {
      skipped.push({ who, why: `error: ${String(e.message || e)}` });
    }
  }

  return Response.json({ month, dry, checked: rentals.length, sent, skipped });
}
