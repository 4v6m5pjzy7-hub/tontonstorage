import Link from 'next/link';
import { getSupabase, supabaseConfigured } from '../lib/supabase.js';
import { createIntake, logout, restoreRental, purgeRental } from './actions.js';
import { requireAuth } from './auth.js';
import { LifecyclePill, RenewalPill, lifecycle, TABS, DELETED_TAB, RESTORE_WINDOW_DAYS } from './ui.js';
import PurgeButton from './PurgeButton.js';
import { TERM_LABELS, money, prettyDate, daysUntil, LOCATIONS, locationLabel, monthKey, monthLabel, shareAmount } from '../lib/format.js';

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
  const loc = searchParams?.loc || 'all';

  // Deleted rentals are held separately for 30 days, not in the pipeline.
  const live = rentals.filter((r) => !r.deleted_at);
  const deleted = rentals
    .filter((r) => r.deleted_at)
    .sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));

  // Location filter applies first so the stage counts reflect the chosen yard.
  const inLoc =
    loc === 'all' ? live
    : loc === 'none' ? live.filter((r) => !r.location)
    : live.filter((r) => r.location === loc);
  const counts = {};
  for (const r of inLoc) {
    const k = lifecycle(r).key;
    counts[k] = (counts[k] || 0) + 1;
  }
  counts.all = inLoc.length;

  const locCounts = { all: live.length };
  for (const l of LOCATIONS) locCounts[l.key] = live.filter((r) => r.location === l.key).length;
  locCounts.none = live.filter((r) => !r.location).length;

  const shown = tab === 'all' ? inLoc : inLoc.filter((r) => lifecycle(r).key === tab);
  const qs = (over) => {
    const p = new URLSearchParams();
    const t = over.tab ?? tab;
    const l = over.loc ?? loc;
    if (t !== 'all') p.set('tab', t);
    if (l !== 'all') p.set('loc', l);
    const s = p.toString();
    return s ? `/?${s}` : '/';
  };

  // Start-of-month reminder: what Marc still owes on Whiskey spots.
  const month = monthKey();
  let whiskeyOwed = 0;
  let whiskeyCount = 0;
  const { data: wRows } = await sb.from('whiskey_rentals').select('*');
  if (wRows) {
    const out = wRows.filter((w) => w.active !== false && !w.settled?.[month]);
    whiskeyCount = out.length;
    whiskeyOwed = out.reduce((s, w) => s + shareAmount(w), 0);
  }

  return (
    <div className="wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1>Rentals</h1>
          <p className="lead" style={{ margin: 0 }}>Send a link, collect info, set the term &amp; rate, then let auto-renewals run.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <form action={createIntake}><button className="btn blue">+ New intake link</button></form>
          <Link className="btn alt" href="/add">+ Add existing customer</Link>
          <Link className="btn alt" href="/whiskey">Whiskey / Marc</Link>
          <form action={logout}><button className="btn ghost">Log out</button></form>
        </div>
      </div>

      {searchParams?.deleted === '1' && <div className="banner ok">Rental deleted.</div>}

      {whiskeyCount > 0 && (
        <div className="banner info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span>
            <strong>Marc owes {money(whiskeyOwed)}</strong> for {monthLabel(month)} across {whiskeyCount} Whiskey spot{whiskeyCount === 1 ? '' : 's'}.
          </span>
          <Link href="/whiskey" className="btn blue" style={{ padding: '7px 14px', fontSize: 13 }}>Review &amp; check off →</Link>
        </div>
      )}

      <div className="tabs" style={{ marginBottom: 8 }}>
        <span className="muted" style={{ alignSelf: 'center', marginRight: 4 }}>Location:</span>
        <Link href={qs({ loc: 'all' })} className={loc === 'all' ? 'on' : ''}>All<span className="n">{locCounts.all}</span></Link>
        {LOCATIONS.map((l) => (
          <Link key={l.key} href={qs({ loc: l.key })} className={loc === l.key ? 'on' : ''}>
            {l.label}<span className="n">{locCounts[l.key] || 0}</span>
          </Link>
        ))}
        <Link href={qs({ loc: 'none' })} className={loc === 'none' ? 'on' : ''}>Unassigned<span className="n">{locCounts.none}</span></Link>
        <Link href="/whiskey" style={{ marginLeft: 'auto' }}>Whiskey profit share →</Link>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <Link key={t.key} href={qs({ tab: t.key })} className={`t-${t.key}${tab === t.key ? ' on' : ''}`}>
            {t.label}<span className="n">{counts[t.key] || 0}</span>
          </Link>
        ))}
        {deleted.length > 0 && (
          <Link href="/?tab=deleted" className={`t-deleted${tab === 'deleted' ? ' on' : ''}`}>
            {DELETED_TAB.label}<span className="n">{deleted.length}</span>
          </Link>
        )}
      </div>

      {tab === 'deleted' && (
        <div className="card">
          <h2>Recently deleted</h2>
          <p className="muted">
            Deleted rentals are kept for {RESTORE_WINDOW_DAYS} days with their contracts and signatures
            intact, then removed automatically. Restore one any time before that.
          </p>
          {deleted.length === 0 ? (
            <div className="empty">Nothing deleted recently.</div>
          ) : (
            <table>
              <thead><tr><th>Client</th><th>Deleted</th><th>Auto-removes in</th><th></th></tr></thead>
              <tbody>
                {deleted.map((r) => {
                  const gone = Math.max(0, RESTORE_WINDOW_DAYS - Math.floor((Date.now() - new Date(r.deleted_at)) / 86400000));
                  return (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.client?.name || '(no client info)'}</strong>
                        {r.terms?.signature?.signedAt && <span className="muted"> · signed copy kept</span>}
                        <br /><span className="muted">{r.terms?.monthlyFee ? `${money(r.terms.monthlyFee)}/mo` : '—'}</span>
                      </td>
                      <td>{new Date(r.deleted_at).toLocaleDateString('en-US')}</td>
                      <td>{`${gone} day${gone === 1 ? '' : 's'}`}</td>
                      <td style={{ display: 'flex', gap: 8 }}>
                        <form action={restoreRental}>
                          <input type="hidden" name="id" value={r.id} />
                          <button className="btn blue" style={{ padding: '6px 14px', fontSize: 13 }}>Restore</button>
                        </form>
                        <form action={purgeRental}>
                          <input type="hidden" name="id" value={r.id} />
                          <PurgeButton name={r.client?.name || ''} />
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab !== 'deleted' && (
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
              <tr><th>Client</th><th>Location</th><th>Stage</th><th>Term</th><th>Rate</th><th>Ends</th><th></th></tr>
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
                    <td>{r.location ? <>{locationLabel(r.location)}{r.spot ? <span className="muted"> · {r.spot}</span> : null}</> : <span className="muted">—</span>}</td>
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
      )}
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
