import Link from 'next/link';
import { getSupabase, supabaseConfigured } from '../../lib/supabase.js';
import { requireAuth } from '../auth.js';
import {
  addWhiskey, updateWhiskey, deleteWhiskey, settleWhiskeyMonth,
  saveWhiskeySettings, sendWhiskeyStatementNow,
} from '../actions.js';
import WhiskeyRow from '../WhiskeyRow.js';
import WhiskeyAdd from '../WhiskeyAdd.js';
import SubmitButton from '../SubmitButton.js';
import { money, monthKey, monthLabel, whiskeySplit } from '../../lib/format.js';

export const dynamic = 'force-dynamic';

export default async function Whiskey({ searchParams }) {
  requireAuth();
  if (!supabaseConfigured()) return null;
  const sb = getSupabase();

  const [{ data: rows = [], error }, { data: settings }, { data: statements = [] }] = await Promise.all([
    sb.from('whiskey_rentals').select('*').order('created_at', { ascending: true }),
    sb.from('whiskey_settings').select('*').eq('id', 1).maybeSingle(),
    sb.from('whiskey_statements').select('*').order('created_at', { ascending: false }).limit(6),
  ]);

  if (error) {
    return (
      <div className="wrap">
        <div className="card banner err">
          Could not load Whiskey spots: {error.message}. Did you run <code>supabase/whiskey-v2.sql</code> in Supabase?
        </div>
      </div>
    );
  }

  const month = monthKey();
  const active = rows.filter((r) => r.active !== false);
  const owed = active.filter((r) => !r.settled?.[month]).reduce((s, r) => s + whiskeySplit(r).owed, 0);
  const owedCount = active.filter((r) => !r.settled?.[month]).length;

  return (
    <div className="wrap">
      <p><Link href="/">← Rentals</Link></p>
      <h1>Whiskey spots</h1>
      <p className="lead">
        Marc Jacob signs these customers directly, so there&apos;s no contract on our side. This tracks
        what he owes TonTon each month.
      </p>

      {searchParams?.added === '1' && <div className="banner ok">Whiskey spot added.</div>}
      {searchParams?.saved === '1' && <div className="banner ok">Saved.</div>}
      {searchParams?.deleted === '1' && <div className="banner ok">Whiskey spot removed.</div>}
      {searchParams?.settings === '1' && <div className="banner ok">Statement settings saved.</div>}
      {searchParams?.stmt === '1' && <div className="banner ok">Statement sent to Marc.</div>}
      {searchParams?.stmt === 'err' && <div className="banner err">Could not send the statement. Check the email address.</div>}
      {searchParams?.e === 'noemail' && <div className="banner err">Add Marc&apos;s email in the statement settings first.</div>}

      {/* Summary - only what Marc owes TonTon */}
      <div className="card" style={{ borderColor: owedCount ? 'var(--blue)' : 'var(--line)' }}>
        <h2>Marc owes TonTon for {monthLabel(month)}</h2>
        {active.length === 0 ? (
          <div className="empty">No active Whiskey spots.</div>
        ) : owedCount === 0 ? (
          <div className="banner ok" style={{ marginBottom: 0 }}>All settled for {monthLabel(month)}.</div>
        ) : (
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>
            {money(owed)} <span className="muted" style={{ fontSize: 14, fontWeight: 500 }}>
              across {owedCount} active Whiskey Spot{owedCount === 1 ? '' : 's'}
            </span>
          </div>
        )}
      </div>

      {/* Monthly statement automation */}
      <div className="card">
        <h2>Monthly statement to Marc</h2>
        <form action={saveWhiskeySettings}>
          <div className="row">
            <div><label>Marc&apos;s email</label>
              <input type="email" name="marc_email" defaultValue={settings?.marc_email || ''} placeholder="marc@example.com" /></div>
            <div><label>Send day of month (1–28)</label>
              <input type="number" name="send_day" min="1" max="28" defaultValue={settings?.send_day ?? 1} /></div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontWeight: 600 }}>
            <input type="checkbox" name="reminders_enabled" defaultChecked={!!settings?.reminders_enabled} style={{ width: 'auto' }} />
            Automatically email Marc a combined statement every month
          </label>
          <p className="muted" style={{ marginTop: 4 }}>
            One statement listing every <strong>active</strong> spot. Inactive spots drop off automatically.
          </p>
          <div className="actions">
            <button className="btn">Save settings</button>
            <a className="btn alt" href="/whiskey/preview" target="_blank" rel="noreferrer">Preview email</a>
            <form action={sendWhiskeyStatementNow} style={{ display: 'inline' }}>
              <SubmitButton className="btn blue" pendingText="Sending…">Send statement now</SubmitButton>
            </form>
          </div>
        </form>

        {statements.length > 0 && (
          <div style={{ marginTop: 18, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            <div className="muted" style={{ fontWeight: 600, marginBottom: 6 }}>Recent statements</div>
            {statements.map((s) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, padding: '3px 0', flexWrap: 'wrap', gap: 8 }}>
                <span>
                  {monthLabel(s.month)} · {money(s.total)} · {s.spot_count} spot{s.spot_count === 1 ? '' : 's'}
                  {s.auto ? ' · auto' : ' · manual'}
                </span>
                <span className={s.status === 'sent' ? '' : ''} style={{ color: s.status === 'sent' ? 'var(--ok)' : 'var(--danger)', fontWeight: 600 }}>
                  {s.status === 'sent' ? 'Sent' : 'Failed'} {new Date(s.created_at).toLocaleDateString('en-US')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Spots */}
      <div className="card">
        <h2>All Whiskey spots</h2>
        {rows.length === 0 ? (
          <div className="empty">None yet. Add one below.</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {rows.map((r) => (
              <WhiskeyRow key={r.id} spot={r} month={month}
                updateAction={updateWhiskey} deleteAction={deleteWhiskey} settleAction={settleWhiskeyMonth} />
            ))}
          </div>
        )}
      </div>

      {/* Add */}
      <div className="card">
        <h2>Add a Whiskey spot</h2>
        <WhiskeyAdd action={addWhiskey} />
      </div>
    </div>
  );
}
