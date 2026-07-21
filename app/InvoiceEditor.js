'use client';
import { useState } from 'react';
import { money, invoiceTotals, lineAmount, DEFAULT_TAX_RATE } from '../lib/format.js';
import SubmitButton from './SubmitButton.js';

// Line-item editor with a service dropdown, free-form flat-rate lines, and
// totals that recalculate as you type.
export default function InvoiceEditor({ invoice = {}, services = [], action }) {
  const [name, setName] = useState(invoice.customer_name || '');
  const [email, setEmail] = useState(invoice.customer_email || '');
  const [phone, setPhone] = useState(invoice.customer_phone || '');
  const [issuedOn, setIssuedOn] = useState(invoice.issued_on || new Date().toISOString().slice(0, 10));
  const [taxRate, setTaxRate] = useState(invoice.tax_rate ?? DEFAULT_TAX_RATE);
  const [notes, setNotes] = useState(invoice.notes || '');
  const [items, setItems] = useState(
    Array.isArray(invoice.items) && invoice.items.length
      ? invoice.items
      : [{ description: '', qty: 1, rate: '' }],
  );
  const [pick, setPick] = useState('');

  const totals = invoiceTotals(items, taxRate);

  const update = (i, field, value) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  const remove = (i) => setItems((prev) => (prev.length === 1 ? [{ description: '', qty: 1, rate: '' }] : prev.filter((_, idx) => idx !== i)));
  const addBlank = () => setItems((prev) => [...prev, { description: '', qty: 1, rate: '' }]);

  const addService = (id) => {
    const s = services.find((x) => x.id === id);
    if (!s) return;
    setItems((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      const line = { description: s.name, qty: 1, rate: s.default_rate ?? '' };
      // reuse a trailing empty row rather than leaving a blank line behind
      if (last && !last.description && !last.rate) next[next.length - 1] = line;
      else next.push(line);
      return next;
    });
    setPick('');
  };

  return (
    <form action={action}>
      <input type="hidden" name="id" value={invoice.id || ''} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <div className="card">
        <h2>Bill to</h2>
        <label>Customer name *</label>
        <input type="text" name="customer_name" value={name} onChange={(e) => setName(e.target.value)} required />
        <div className="row">
          <div><label>Email</label>
            <input type="email" name="customer_email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="needed to email the invoice" /></div>
          <div><label>Phone</label>
            <input type="tel" name="customer_phone" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        </div>
        <div className="row">
          <div><label>Invoice date</label>
            <input type="date" name="issued_on" value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} /></div>
          <div><label>Sales tax (%)</label>
            <input type="number" name="tax_rate" step="0.01" min="0" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} /></div>
        </div>
      </div>

      <div className="card">
        <h2>Line items</h2>

        <div className="row" style={{ alignItems: 'end' }}>
          <div>
            <label>Add a saved service</label>
            <select value={pick} onChange={(e) => addService(e.target.value)}>
              <option value="">Choose a service…</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.default_rate != null ? ` — ${money(s.default_rate)}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Or add your own line</label>
            <button type="button" className="btn alt" style={{ width: '100%' }} onClick={addBlank}>
              + Add flat-rate line
            </button>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          {items.map((it, i) => (
            <div key={i} className="lineitem">
              <div className="li-desc">
                <label>Description</label>
                <input type="text" value={it.description || ''} onChange={(e) => update(i, 'description', e.target.value)}
                       placeholder="e.g. Move boat to wash rack" />
              </div>
              <div className="li-qty">
                <label>Qty</label>
                <input type="number" step="0.01" min="0" value={it.qty ?? 1} onChange={(e) => update(i, 'qty', e.target.value)} />
              </div>
              <div className="li-rate">
                <label>Rate ($)</label>
                <input type="number" step="0.01" min="0" value={it.rate ?? ''} onChange={(e) => update(i, 'rate', e.target.value)} />
              </div>
              <div className="li-amt">
                <label>Amount</label>
                <div className="li-amt-val">{money(lineAmount(it))}</div>
              </div>
              <div className="li-del">
                <button type="button" className="btn ghost" onClick={() => remove(i)} aria-label="Remove line">✕</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18, background: '#f2f5fa', borderRadius: 10, padding: '14px 16px' }}>
          <dl className="kv" style={{ gridTemplateColumns: '1fr auto', gap: '5px 14px' }}>
            <dt>Subtotal</dt><dd>{money(totals.subtotal)}</dd>
            <dt>Sales tax ({Number(taxRate) || 0}%)</dt><dd>{money(totals.tax)}</dd>
            <dt style={{ fontWeight: 800, color: 'var(--navy)', borderTop: '1px solid #d8dfe8', paddingTop: 6 }}>Total due</dt>
            <dd style={{ fontWeight: 800, color: 'var(--navy)', borderTop: '1px solid #d8dfe8', paddingTop: 6 }}>{money(totals.total)}</dd>
          </dl>
        </div>

        <label style={{ marginTop: 16 }}>Notes (optional)</label>
        <textarea name="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything you want printed on the invoice." />

        <div className="actions">
          <SubmitButton className="btn blue" pendingText="Saving…">Save invoice</SubmitButton>
        </div>
      </div>
    </form>
  );
}
