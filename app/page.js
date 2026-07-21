import Link from 'next/link';
import { getSupabase, supabaseConfigured } from '../lib/supabase.js';
import { createIntake, logout } from './actions.js';
import { requireAuth } from './auth.js';
import { LifecyclePill, RenewalPill, lifecycle, TABS } from './ui.js';
import { TERM_LABELS, money, prettyDate, daysUntil } from '../lib/format.js';

export const dynamic = 'force-dynamic';

export default async function Dashboard({ searchParams }) {
  requireAuth();
  if (!supabaseConfigured()) return <SetupNotice />;

  const sb = getSupabase();
  const { data: rentals = [], error } = await sb
    .from('rentals')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="wrap">
        <div className="card banner err">Could not load rentals: {error.message}. Did you run supabase/schema.sql?</div>
      </div>
    );
  }

  const tab = searchParams?.tab || 'all';
  const counts = {};
  for (const r of rentals) {
    const k = lifecycle(r).key;
    counts[k] = (counts[k] || 0) + 1;
  }
  counts.all = rentals.length;

  const shown = tab === 'all' ? rentals : rentals.filter((r) => lifecycle(r).key === tab);

  return (
    <div className="wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1>Rentals</h1>
          <p className="lead" style={{ margin: 0 }}>Send a link, collect info, set the term &amp; rate, then let auto-renewals run.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <form action={createIntake}><button className="btn blue">+ New intake link</button></form>
          <form action={logout}><button className="btn ghost">Log out</button></form>
        </div>
      </div>

      {searchParams?.deleted === '1' && <div className="banner ok">Rental deleted.</div>}

      <div className="tabs">
        {TABS.map((t) => (
          <Link key={t.key} href={t.key === 'all' ? '/' : `/?tab=${t.key}`} className={tab === t.key ? 'on' : ''}>
            {t.label}<span className="n">{counts[t.key] || 0}</span>
          </Link>
        ))}
      </div>

      <div className="card">
        {shown.length === 0 ? (
          <div className="empty">
            {rentals.length === 0
              ? 'No rentals yet. Create an intake link to send to your first client.'
              : 'Nothing in this stage right now.'}
          </div>
        ) : (
          <table>
            <thead>
              <tr><th>Client</th><th>Stage</th><th>Term</th><th>Rate</th><th>Ends</th><th></th></tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const name = r.client?.name || '(awaiting client info)';
                const end = r.terms?.endDate;
                const dleft = end ? daysUntil(end) : null;
                return (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/admin/${r.id}`}><strong>{name}</strong></Link>
                      <br /><span className="muted">{new Date(r.created_at).toLocaleDateString('en-US')}</span>
                    </td>
                    <td><LifecyclePill rental={r} /><RenewalPill status={r.status} /></td>
                    <td>{TERM_LABELS[r.terms?.termType] || '—'}</td>
                    <td>{r.terms?.monthlyFee ? `${money(r.terms.monthlyFee)}/mo` : '—'}</td>
                    <td>{end ? <>{prettyDate(end)}{dleft !== null && dleft >= 0 && dleft <= 45 && <span className="muted"> ({dleft}d)</span>}</> : '—'}</td>
                    <td><Link href={`/admin/${r.id}`}>Open →</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SetupNotice() {
  return (
    <div className="wrap">
      <div className="card">
        <h1>Almost there</h1>
        <p className="lead">Supabase isn&apos;t configured yet. Copy <code>.env.local.example</code> to <code>.env.local</code>, fill in your Supabase and Resend keys, run <code>supabase/schema.sql</code> in the Supabase SQL editor, then restart. See <code>SETUP.md</code>.</p>
      </div>
    </div>
  );
}
