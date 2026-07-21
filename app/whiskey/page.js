import Link from 'next/link';
import { getSupabase, supabaseConfigured } from '../../lib/supabase.js';
import { requireAuth } from '../auth.js';
import { addWhiskey, updateWhiskey, deleteWhiskey, settleWhiskeyMonth } from '../actions.js';
import { money, monthKey, monthLabel, shareAmount } from '../../lib/format.js';

export const dynamic = 'force-dynamic';

export default async function Whiskey({ searchParams }) {
  requireAuth();
  if (!supabaseConfigured()) return null;

  const sb = getSupabase();
  const { data: rows = [], error } = await sb
    .from('whiskey_rentals')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    return (
      <div className="wrap">
        <div className="card banner err">
          Could not load Whiskey spots: {error.message}. Did you run <code>supabase/whiskey.sql</code> in Supabase?
        </div>
      </div>
    );
  }

  const month = searchParams?.month || monthKey();
  const active = rows.filter((r) => r.active !== false);
  const outstanding = active.filter((r) => !r.settled?.[month]);
  const settledRows = active.filter((r) => r.settled?.[month]);
  const owed = outstanding.reduce((s, r) => s + shareAmount(r), 0);
  const collected = settledRows.reduce((s, r) => s + (Number(r.settled[month]?.amount) || 0), 0);

  return (
    <div className="wrap">
      <p><Link href="/">← Rentals</Link></p>
      <h1>Whiskey spots</h1>
      <p className="lead">
        Marc Jacob signs these customers directly, so there&apos;s no contract on our side. This is just
        what he owes TonTon each month.
      </p>

      {searchParams?.added === '1' && <div className="banner ok">Whiskey spot added.</div>}
      {searchParams?.saved === '1' && <div className="banner ok">Saved.</div>}
      {searchParams?.deleted === '1' && <div className="banner ok">Whiskey spot removed.</div>}

      {/* Monthly settlement */}
      <div className="card" style={{ borderColor: outstanding.length ? 'var(--accent)' : 'var(--line)' }}>
        <h2>Marc owes for {monthLabel(month)}</h2>
        {active.length === 0 ? (
          <div className="empty">No Whiskey spots yet. Add one below.</div>
        ) : outstanding.length === 0 ? (
          <div className="banner ok">All settled for {monthLabel(month)} — {money(collected)} collected.</div>
        ) : (
          <>
            <div className="banner info">
              <strong>{money(owed)}</strong> outstanding across {outstanding.length} spot{outstanding.length === 1 ? '' : 's'}.
            </div>
            <div className="table-wrap">
            <table className="responsive">
              <thead><tr><th>Customer</th><th>Spot</th><th>Monthly</th><th>Share</th><th>Owed</th><th></th></tr></thead>
              <tbody>
                {outstanding.map((r) => (
                  <tr key={r.id}>
                    <td data-label=""><strong>{r.name}</strong></td>
                    <td data-label="Spot"><span>{r.spot || '—'}</span></td>
                    <td data-label="Monthly"><span>{money(r.monthly_amount)}</span></td>
                    <td data-label="Share"><span>{Number(r.share_percent) || 0}%</span></td>
                    <td data-label="Owed"><strong>{money(shareAmount(r))}</strong></td>
                    <td data-label="">
                      <form action={settleWhiskeyMonth}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="month" value={month} />
                        <input type="hidden" name="amount" value={shareAmount(r)} />
                        <button className="btn blue" style={{ padding: '7px 14px', fontSize: 13 }}>Mark received</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}

        {settledRows.length > 0 && (
          <>
            <p className="muted" style={{ marginTop: 18, fontWeight: 600 }}>
              Received this month ({money(collected)})
            </p>
            <table>
              <tbody>
                {settledRows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name} {r.spot ? <span className="muted">· {r.spot}</span> : null}</td>
                    <td style={{ textAlign: 'right' }}>{money(r.settled[month]?.amount)}</td>
                    <td style={{ width: 90 }}>
                      <form action={settleWhiskeyMonth}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="month" value={month} />
                        <input type="hidden" name="undo" value="1" />
                        <button className="btn ghost" style={{ padding: '5px 12px', fontSize: 12 }}>Undo</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* All spots */}
      <div className="card">
        <h2>All Whiskey spots</h2>
        {rows.length === 0 ? (
          <div className="empty">None yet.</div>
        ) : (
          rows.map((r) => (
            <form key={r.id} action={updateWhiskey} style={{ borderBottom: '1px solid var(--line)', padding: '12px 0' }}>
              <input type="hidden" name="id" value={r.id} />
              <div className="row3">
                <div><label>Customer</label><input type="text" name="name" defaultValue={r.name} required /></div>
                <div><label>Spot #</label><input type="text" name="spot" defaultValue={r.spot || ''} /></div>
                <div><label>Monthly ($)</label><input type="number" name="monthly_amount" step="0.01" min="0" defaultValue={r.monthly_amount ?? ''} /></div>
                <div><label>Marc&apos;s share (%)</label><input type="number" name="share_percent" step="0.1" min="0" max="100" defaultValue={r.share_percent ?? ''} /></div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                  <input type="checkbox" name="active" defaultChecked={r.active !== false} style={{ width: 'auto' }} /> Active
                </label>
                <span className="muted">Owes {money(shareAmount(r))}/mo</span>
                <button className="btn alt" style={{ padding: '8px 16px', fontSize: 13 }}>Save</button>
              </div>
            </form>
          ))
        )}

        {rows.map((r) => (
          <form key={`del-${r.id}`} action={deleteWhiskey} style={{ display: 'inline-block', marginTop: 8, marginRight: 8 }}>
            <input type="hidden" name="id" value={r.id} />
            <button className="btn ghost" style={{ padding: '5px 12px', fontSize: 12 }}>Remove {r.name}</button>
          </form>
        ))}
      </div>

      {/* Add */}
      <div className="card">
        <h2>Add a Whiskey spot</h2>
        <form action={addWhiskey}>
          <div className="row3">
            <div><label>Customer name *</label><input type="text" name="name" required /></div>
            <div><label>Spot #</label><input type="text" name="spot" placeholder="e.g. W-12" /></div>
            <div><label>Monthly amount ($) *</label><input type="number" name="monthly_amount" step="0.01" min="0" required /></div>
            <div><label>Marc&apos;s share (%) *</label><input type="number" name="share_percent" step="0.1" min="0" max="100" required /></div>
          </div>
          <label>Notes (optional)</label><input type="text" name="notes" />
          <div className="actions"><button className="btn blue">Add spot</button></div>
        </form>
      </div>
    </div>
  );
}
