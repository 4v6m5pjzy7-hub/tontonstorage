import { getSupabase, supabaseConfigured } from '../../../lib/supabase.js';
import { recordRenewalChoice } from '../../actions.js';
import { prettyDate } from '../../../lib/format.js';

export const dynamic = 'force-dynamic';

export default async function Renew({ params, searchParams }) {
  if (!supabaseConfigured()) {
    return <div className="wrap"><div className="card"><h1>Not available</h1></div></div>;
  }
  const sb = getSupabase();
  const { data: r } = await sb.from('rentals').select('*').eq('renew_token', params.token).single();
  if (!r) {
    return <div className="wrap"><div className="card"><h1>This link is not valid</h1><p className="muted">Contact TonTon Trailer Rentals at 954-298-7794.</p></div></div>;
  }

  const c = r.client || {};
  const t = r.terms || {};

  // After responding
  if (searchParams?.done === 'extend' || r.status === 'extend_requested' || r.status === 'renewed') {
    return (
      <div className="wrap"><div className="card">
        <h1>Thanks{c.name ? `, ${c.name}` : ''}!</h1>
        <p className="lead">We&apos;ve let the team know you&apos;d like to extend. TonTon Trailer Rentals will email you your extension options and pricing shortly.</p>
      </div></div>
    );
  }
  if (searchParams?.done === 'vacate' || r.status === 'vacating') {
    return (
      <div className="wrap"><div className="card">
        <h1>Got it{c.name ? `, ${c.name}` : ''}.</h1>
        <p className="lead">We&apos;ve noted that you&apos;ll be vacating. Please remove your property by <strong>{prettyDate(t.endDate)}</strong> to avoid additional charges. Questions? Call 954-298-7794.</p>
      </div></div>
    );
  }

  // The pre-selected choice from the email (?choice=extend|vacate) is confirmed here
  // with a button, so email link prefetching can't auto-submit.
  const preselect = searchParams?.choice;

  return (
    <div className="wrap">
      <div className="card">
        <h1>Your storage term is coming due</h1>
        <p className="lead">Hi {c.name || 'there'}, your storage agreement is scheduled to end on <strong>{prettyDate(t.endDate)}</strong>. What would you like to do?</p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
          <form action={recordRenewalChoice}>
            <input type="hidden" name="renew_token" value={r.renew_token} />
            <input type="hidden" name="choice" value="extend" />
            <button className="btn blue" style={preselect === 'extend' ? { outline: '3px solid #9ec1f2' } : undefined}>I want to extend</button>
          </form>
          <form action={recordRenewalChoice}>
            <input type="hidden" name="renew_token" value={r.renew_token} />
            <input type="hidden" name="choice" value="vacate" />
            <button className="btn ghost">I will be vacating</button>
          </form>
        </div>

        <p className="muted" style={{ marginTop: 18 }}>If you extend, we&apos;ll email your options and pricing. If you vacate, please remove your property by the end date.</p>
      </div>
    </div>
  );
}
