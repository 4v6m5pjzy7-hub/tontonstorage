'use client';
import { useState, useMemo, useEffect } from 'react';
import { prorateFirstMonth, dueAtSigning, money, prettyDate, TERM_MONTHS } from '../lib/format.js';
import SubmitButton from './SubmitButton.js';

// Set term & rate, with the proration and due-at-signing totals recalculating
// live as you type. The prorated amount auto-fills but stays editable.
export default function TermCalculator({ rentalId, terms = {}, contractHref, action }) {
  const [termType, setTermType] = useState(terms.termType || '');
  const [monthlyFee, setMonthlyFee] = useState(terms.monthlyFee ?? '');
  const [schedule, setSchedule] = useState(terms.paymentSchedule || 'monthly');
  const [method, setMethod] = useState(terms.paymentMethod || 'cash');
  const [agreementDate, setAgreementDate] = useState(terms.agreementDate || '');
  const [startDate, setStartDate] = useState(terms.startDate || '');
  const [prorate, setProrate] = useState(!!terms.prorate);
  const [prorated, setProrated] = useState(terms.proration?.amount ?? '');
  const [edited, setEdited] = useState(false);
  const [oneTimeAmount, setOneTimeAmount] = useState(terms.oneTimeAmount || '');
  const [oneTimeLabel, setOneTimeLabel] = useState(terms.oneTimeLabel || '');

  const auto = useMemo(
    () => (prorate && startDate && monthlyFee !== '' ? prorateFirstMonth(monthlyFee, startDate) : null),
    [prorate, startDate, monthlyFee],
  );

  // Auto-fill the prorated amount until the user overrides it by hand.
  useEffect(() => {
    if (!prorate) { setProrated(''); setEdited(false); return; }
    if (!edited && auto) setProrated(String(auto.amount));
  }, [prorate, auto, edited]);

  const due = useMemo(
    () => dueAtSigning({
      monthlyFee,
      termType,
      paymentSchedule: schedule,
      proration: prorate && prorated !== '' ? { amount: Number(prorated) } : null,
      oneTimeAmount,
      oneTimeLabel,
    }),
    [monthlyFee, termType, schedule, prorate, prorated, oneTimeAmount, oneTimeLabel],
  );

  const months = TERM_MONTHS[termType] || 0;
  const row = (label, value, strong) => (
    <>
      <dt style={strong ? { fontWeight: 800, color: 'var(--navy)', borderTop: '1px solid #d8dfe8', paddingTop: 6 } : undefined}>{label}</dt>
      <dd style={strong ? { fontWeight: 800, color: 'var(--navy)', borderTop: '1px solid #d8dfe8', paddingTop: 6 } : undefined}>{value}</dd>
    </>
  );

  return (
    <form action={action}>
      <input type="hidden" name="id" value={rentalId} />
      <input type="hidden" name="proratedOverride" value={prorate ? prorated : ''} />

      <div className="row">
        <div>
          <label>Term type</label>
          <select name="termType" value={termType} onChange={(e) => setTermType(e.target.value)} required>
            <option value="">Select…</option>
            <option value="month-to-month">Month-to-month</option>
            <option value="fixed-3">Fixed - 3 month</option>
            <option value="fixed-6">Fixed - 6 month</option>
            <option value="fixed-12">Fixed - 12 month</option>
          </select>
        </div>
        <div>
          <label>Monthly storage fee ($)</label>
          <input type="number" name="monthlyFee" min="0" step="0.01" value={monthlyFee}
                 onChange={(e) => setMonthlyFee(e.target.value)} required />
        </div>
      </div>

      <div className="row">
        <div>
          <label>Payment schedule</label>
          <select name="paymentSchedule" value={schedule} onChange={(e) => setSchedule(e.target.value)}>
            <option value="monthly">Monthly</option>
            <option value="prepaid">Prepaid (pay full term up front)</option>
          </select>
        </div>
        <div>
          <label>Payment method</label>
          <select name="paymentMethod" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="cash">Cash</option>
            <option value="zelle">Zelle</option>
            <option value="card">Card (+3%)</option>
            <option value="check">Check</option>
          </select>
        </div>
      </div>

      <div className="row">
        <div><label>Agreement date</label>
          <input type="date" name="agreementDate" value={agreementDate} onChange={(e) => setAgreementDate(e.target.value)} /></div>
        <div><label>Start date</label>
          <input type="date" name="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
      </div>

      <fieldset className="fieldset" style={{ marginTop: 16 }}>
        <legend>Prorate &amp; one-time payment</legend>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
          <input type="checkbox" name="prorate" checked={prorate}
                 onChange={(e) => { setProrate(e.target.checked); setEdited(false); }} style={{ width: 'auto' }} />
          Prorate the first partial month
        </label>
        <p className="muted" style={{ margin: '4px 0 0' }}>
          Bills from the start date through the end of that month, then the term starts the 1st of the next month.
        </p>

        {prorate && (
          <div className="row" style={{ marginTop: 10 }}>
            <div>
              <label>Prorated amount ($) — auto-calculated, editable</label>
              <input type="number" step="0.01" min="0" value={prorated}
                     onChange={(e) => { setProrated(e.target.value); setEdited(true); }} />
              {auto && (
                <p className="muted" style={{ marginTop: 4 }}>
                  {auto.days} of {auto.daysInMonth} days ({prettyDate(auto.from)} – {prettyDate(auto.to)}) = {money(auto.amount)}
                  {edited && String(auto.amount) !== String(prorated) && (
                    <> · <button type="button" className="btn ghost" style={{ padding: '2px 8px', fontSize: 11 }}
                        onClick={() => { setProrated(String(auto.amount)); setEdited(false); }}>reset</button></>
                  )}
                </p>
              )}
              {!startDate && <p className="muted" style={{ marginTop: 4 }}>Pick a start date to calculate.</p>}
            </div>
            <div />
          </div>
        )}

        <div className="row" style={{ marginTop: 10 }}>
          <div><label>One-time payment ($)</label>
            <input type="number" name="oneTimeAmount" min="0" step="0.01" value={oneTimeAmount}
                   onChange={(e) => setOneTimeAmount(e.target.value)} placeholder="optional" /></div>
          <div><label>What is it for?</label>
            <input type="text" name="oneTimeLabel" value={oneTimeLabel}
                   onChange={(e) => setOneTimeLabel(e.target.value)} placeholder="e.g. Deposit, setup fee" /></div>
        </div>
      </fieldset>

      {monthlyFee !== '' && (
        <div style={{ marginTop: 14, background: '#f2f5fa', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>
            Due at signing {due.prepaid && <span className="muted" style={{ fontWeight: 500 }}>· paid in full up front</span>}
          </div>
          <dl className="kv" style={{ gridTemplateColumns: '1fr auto', gap: '4px 14px' }}>
            {due.prorated > 0 && row(
              auto ? `Prorated ${prettyDate(auto.from)} – ${prettyDate(auto.to)} (${auto.days} days)` : 'Prorated first month',
              money(due.prorated),
            )}
            {due.prepaid
              ? row(`Full term (${due.months} months × ${money(monthlyFee)})`, money(due.termTotal))
              : (<>
                  {row('First month', money(due.firstMonth))}
                  {row('Last month (held)', money(due.lastMonth))}
                </>)}
            {due.oneTime > 0 && row(oneTimeLabel || 'One-time payment', money(due.oneTime))}
            {row('Total', money(due.total), true)}
          </dl>
          {due.prepaid && (
            <p className="muted" style={{ marginTop: 8 }}>
              Prepaid terms are skipped by the monthly payment reminder emails.
            </p>
          )}
        </div>
      )}

      <div className="actions">
        <SubmitButton className="btn" pendingText="Saving…">Save</SubmitButton>
        <a className="btn blue" href={contractHref} target="_blank" rel="noreferrer">Generate contract →</a>
      </div>
    </form>
  );
}
