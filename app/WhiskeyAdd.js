'use client';
import { useState } from 'react';
import { money, whiskeySplit } from '../lib/format.js';
import SubmitButton from './SubmitButton.js';

export default function WhiskeyAdd({ action }) {
  const [rent, setRent] = useState('');
  const [tontonPct, setTontonPct] = useState(20);
  const marcPct = Math.round((100 - (Number(tontonPct) || 0)) * 100) / 100;
  const live = whiskeySplit({ monthly_amount: rent, tonton_percent: tontonPct });

  return (
    <form action={action}>
      <input type="hidden" name="tonton_percent" value={tontonPct} />
      <div className="row">
        <div><label>Customer name *</label><input type="text" name="name" required /></div>
        <div><label>Spot #</label><input type="text" name="spot" placeholder="e.g. W-12" /></div>
      </div>
      <div className="row3">
        <div><label>Monthly rent ($) *</label>
          <input type="number" name="monthly_amount" step="0.01" min="0" value={rent} onChange={(e) => setRent(e.target.value)} required /></div>
        <div><label>Marc keeps (%)</label>
          <input type="number" step="0.1" min="0" max="100" value={marcPct}
                 onChange={(e) => setTontonPct(Math.round((100 - (Number(e.target.value) || 0)) * 100) / 100)} /></div>
        <div><label>TonTon share (%) *</label>
          <input type="number" step="0.1" min="0" max="100" value={tontonPct} onChange={(e) => setTontonPct(e.target.value)} required /></div>
      </div>
      {rent !== '' && (
        <div style={{ background: '#f2f5fa', borderRadius: 8, padding: '10px 14px', marginTop: 12, fontSize: 14 }}>
          Marc keeps <strong>{money(live.marcKeeps)}</strong> · Marc owes TonTon <strong style={{ color: 'var(--navy)' }}>{money(live.owed)}</strong> / month
        </div>
      )}
      <label>Notes (optional)</label><input type="text" name="notes" />
      <div className="actions"><SubmitButton className="btn blue" pendingText="Adding…">+ Add spot</SubmitButton></div>
    </form>
  );
}
