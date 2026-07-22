'use client';
import { useState } from 'react';
import { money, whiskeySplit, monthLabel } from '../lib/format.js';

// One Whiskey spot. Display mode shows the split; edit mode lets you change it
// with the two percentages auto-complementing to 100. Mark paid / history /
// delete are their own little forms so they post independently.
export default function WhiskeyRow({ spot, month, updateAction, deleteAction, settleAction }) {
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [name, setName] = useState(spot.name || '');
  const [spotNo, setSpotNo] = useState(spot.spot || '');
  const [rent, setRent] = useState(spot.monthly_amount ?? '');
  const [tontonPct, setTontonPct] = useState(spot.tonton_percent ?? spot.share_percent ?? 0);
  const [active, setActive] = useState(spot.active !== false);

  const marcPct = Math.round((100 - (Number(tontonPct) || 0)) * 100) / 100;
  const live = whiskeySplit({ monthly_amount: rent, tonton_percent: tontonPct });
  const saved = whiskeySplit(spot);
  const paid = spot.settled?.[month];
  const history = Object.entries(spot.settled || {}).sort((a, b) => b[0].localeCompare(a[0]));

  const reset = () => {
    setName(spot.name || ''); setSpotNo(spot.spot || '');
    setRent(spot.monthly_amount ?? ''); setTontonPct(spot.tonton_percent ?? spot.share_percent ?? 0);
    setActive(spot.active !== false); setEditing(false);
  };

  if (editing) {
    return (
      <div className="wcard editing">
        <form action={updateAction}>
          <input type="hidden" name="id" value={spot.id} />
          <input type="hidden" name="tonton_percent" value={tontonPct} />
          <div className="row">
            <div><label>Customer</label><input type="text" name="name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <div><label>Spot #</label><input type="text" name="spot" value={spotNo} onChange={(e) => setSpotNo(e.target.value)} /></div>
          </div>
          <div className="row3">
            <div><label>Monthly rent ($)</label>
              <input type="number" name="monthly_amount" step="0.01" min="0" value={rent} onChange={(e) => setRent(e.target.value)} /></div>
            <div><label>Marc keeps (%)</label>
              <input type="number" step="0.1" min="0" max="100" value={marcPct}
                     onChange={(e) => setTontonPct(Math.round((100 - (Number(e.target.value) || 0)) * 100) / 100)} /></div>
            <div><label>TonTon share (%)</label>
              <input type="number" step="0.1" min="0" max="100" value={tontonPct}
                     onChange={(e) => setTontonPct(e.target.value)} /></div>
            <div>
              <label>Status</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontWeight: 500 }}>
                <input type="checkbox" name="active" checked={active} onChange={(e) => setActive(e.target.checked)} style={{ width: 'auto' }} /> Active
              </label>
            </div>
          </div>
          <div style={{ background: '#f2f5fa', borderRadius: 8, padding: '10px 14px', marginTop: 12, fontSize: 14 }}>
            Marc keeps <strong>{money(live.marcKeeps)}</strong> · Marc owes TonTon <strong style={{ color: 'var(--navy)' }}>{money(live.owed)}</strong>
          </div>
          <div className="actions">
            <button className="btn blue">Save</button>
            <button type="button" className="btn ghost" onClick={reset}>Cancel</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="wcard">
      <div className="wcard-head">
        <div>
          <strong style={{ fontSize: 16 }}>{spot.name}</strong>
          {spot.spot ? <span className="muted"> · {spot.spot}</span> : null}
          {' '}
          <span className={`pill ${active ? 'lc-paid' : 'expired'}`}>{active ? 'Active' : 'Inactive'}</span>
          {' '}
          {active && (paid
            ? <span className="pill lc-paid">Paid {monthLabel(month).split(' ')[0]}</span>
            : <span className="pill lc-signed_unpaid">Unpaid</span>)}
        </div>
      </div>

      <dl className="kv" style={{ gridTemplateColumns: '1fr 1fr', gap: '4px 18px', margin: '10px 0 0' }}>
        <dt>Monthly rent</dt><dd>{money(saved.rent)}</dd>
        <dt>Marc keeps ({saved.marcPct}%)</dt><dd>{money(saved.marcKeeps)}</dd>
        <dt style={{ color: 'var(--navy)', fontWeight: 600 }}>Marc owes TonTon ({saved.tontonPct}%)</dt>
        <dd style={{ color: 'var(--navy)', fontWeight: 800 }}>{money(saved.owed)}</dd>
      </dl>

      <div className="actions" style={{ marginTop: 14 }}>
        <button className="btn alt" style={{ padding: '7px 14px', fontSize: 13 }} onClick={() => setEditing(true)}>Edit</button>

        {active && (paid ? (
          <form action={settleAction}>
            <input type="hidden" name="id" value={spot.id} />
            <input type="hidden" name="month" value={month} />
            <input type="hidden" name="undo" value="1" />
            <button className="btn ghost" style={{ padding: '7px 14px', fontSize: 13 }}>Mark unpaid</button>
          </form>
        ) : (
          <form action={settleAction}>
            <input type="hidden" name="id" value={spot.id} />
            <input type="hidden" name="month" value={month} />
            <input type="hidden" name="amount" value={saved.owed} />
            <button className="btn" style={{ padding: '7px 14px', fontSize: 13 }}>Mark as paid</button>
          </form>
        ))}

        <button className="btn ghost" style={{ padding: '7px 14px', fontSize: 13 }} onClick={() => setShowHistory((v) => !v)}>
          {showHistory ? 'Hide history' : 'Payment history'}
        </button>

        <form action={deleteAction} onSubmit={(e) => { if (!confirm(`Delete Whiskey spot "${spot.name}"? This cannot be undone.`)) e.preventDefault(); }}>
          <input type="hidden" name="id" value={spot.id} />
          <button className="btn ghost" style={{ padding: '7px 14px', fontSize: 13, color: 'var(--danger)' }}>Delete</button>
        </form>
      </div>

      {showHistory && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
          <div className="muted" style={{ fontWeight: 600, marginBottom: 6 }}>Payment history</div>
          {history.length === 0 ? (
            <div className="muted">No payments recorded yet.</div>
          ) : (
            history.map(([m, info]) => (
              <div key={m} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '3px 0' }}>
                <span>{monthLabel(m)}</span>
                <span>{money(info.amount)} <span className="muted">· {new Date(info.at).toLocaleDateString('en-US')}</span></span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
