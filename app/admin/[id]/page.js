import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabase, supabaseConfigured } from '../../../lib/supabase.js';
import { saveContactAndSend, saveTerms, sendExtension } from '../../actions.js';
import { StatusPill } from '../../ui.js';
import CopyButton from '../../CopyButton.js';
import { emailConfigured } from '../../../lib/email.js';
import { TERM_LABELS, money, prettyDate, addMonths } from '../../../lib/format.js';

export const dynamic = 'force-dynamic';

function appUrl() {
  return process.env.APP_URL || 'http://localhost:3500';
}

export default async function AdminFile({ params, searchParams }) {
  if (!supabaseConfigured()) notFound();
  const sb = getSupabase();
  const { data: r } = await sb.from('rentals').select('*').eq('id', params.id).single();
  if (!r) notFound();

  const link = `${appUrl()}/intake/${r.token}`;
  const c = r.client;
  const p = c?.property || {};
  const t = r.terms || {};
  const contact = r.contact || {};

  const banner =
    searchParams?.sent === '1' ? <div className="banner ok">Intake link emailed to the client.</div> :
    searchParams?.ext === '1' ? <div className="banner ok">Extension addendum emailed to the tenant.</div> :
    null;

  const types = [];
  if (Number(p.boat) > 0) types.push(`Boat ×${p.boat}`);
  if (Number(p.trailer) > 0) types.push(`Trailer ×${p.trailer}`);
  if (Number(p.rv) > 0) types.push(`RV ×${p.rv}`);
  if (Number(p.vehicle) > 0) types.push(`Vehicle ×${p.vehicle}`);
  if (p.other) types.push(`Other: ${p.other}`);

  return (
    <div className="wrap">
      <p><Link href="/">← Dashboard</Link></p>
      <h1>{c?.name || 'New rental'} <StatusPill status={r.status} /></h1>
      {banner}

      {/* 1. Send the intake link */}
      <div className="card">
        <h2>1 · Send the client intake link</h2>
        <p className="muted">Grab the client&apos;s email while you&apos;re on the call, then email the link. It comes back here once they fill it out.</p>
        <form action={saveContactAndSend}>
          <input type="hidden" name="id" value={r.id} />
          <div className="row">
            <div><label>Client email</label><input type="email" name="email" defaultValue={contact.email || ''} placeholder="client@example.com" /></div>
            <div><label>Client phone</label><input type="tel" name="phone" defaultValue={contact.phone || ''} placeholder="954-555-0100" /></div>
          </div>
          <div className="actions">
            <button className="btn blue" name="mode" value="send">Email the link</button>
            <button className="btn alt" name="mode" value="save">Save contact</button>
            {!emailConfigured() && <span className="muted" style={{ alignSelf: 'center' }}>Email sending is off until RESEND_API_KEY is set.</span>}
          </div>
        </form>
        <p className="muted" style={{ marginTop: 16 }}>Or copy the raw link:</p>
        <div className="linkbox">
          <input readOnly value={link} />
          <CopyButton text={link} />
          <a className="btn alt" href={link} target="_blank" rel="noreferrer">Open</a>
        </div>
      </div>

      {/* 2. Client details */}
      <div className="card">
        <h2>2 · Client details</h2>
        {!c ? (
          <div className="empty">Waiting on the client to submit the form.</div>
        ) : (
          <>
            <dl className="kv">
              <dt>Name</dt><dd>{c.name}</dd>
              <dt>Phone</dt><dd>{c.phone}</dd>
              <dt>Email</dt><dd>{c.email}</dd>
              <dt>Stored property</dt><dd>{types.join(', ') || '—'}</dd>
              <dt>Make / Model</dt><dd>{p.makeModel || '—'}</dd>
              <dt>Length (overall)</dt><dd>{p.length || '—'}</dd>
              <dt>License / Reg #</dt><dd>{p.licenseReg || '—'}</dd>
              <dt>Insurance / Policy #</dt><dd>{p.insurance || '—'}</dd>
            </dl>
            <p className="muted" style={{ marginTop: 14 }}>Submitted {r.submitted_at ? new Date(r.submitted_at).toLocaleString('en-US') : ''}</p>
          </>
        )}
      </div>

      {/* 3. Set term & rate */}
      {c && (
        <div className="card">
          <h2>3 · Set term &amp; rate</h2>
          <form action={saveTerms}>
            <input type="hidden" name="id" value={r.id} />
            <div className="row">
              <div><label>Term type</label>
                <select name="termType" defaultValue={t.termType || ''} required>
                  <option value="">Select…</option>
                  <option value="month-to-month">Month-to-month</option>
                  <option value="fixed-3">Fixed - 3 month</option>
                  <option value="fixed-6">Fixed - 6 month</option>
                  <option value="fixed-12">Fixed - 12 month</option>
                </select>
              </div>
              <div><label>Monthly storage fee ($)</label>
                <input type="number" name="monthlyFee" min="0" step="1" defaultValue={t.monthlyFee || ''} required /></div>
            </div>
            <div className="row">
              <div><label>Payment schedule</label>
                <select name="paymentSchedule" defaultValue={t.paymentSchedule || 'monthly'}>
                  <option value="monthly">Monthly</option>
                  <option value="prepaid">Prepaid</option>
                </select></div>
              <div><label>Payment method</label>
                <select name="paymentMethod" defaultValue={t.paymentMethod || 'cash'}>
                  <option value="cash">Cash</option>
                  <option value="zelle">Zelle</option>
                  <option value="card">Card (+3%)</option>
                </select></div>
            </div>
            <div className="row">
              <div><label>Agreement date</label><input type="date" name="agreementDate" defaultValue={t.agreementDate || ''} /></div>
              <div><label>Start date</label><input type="date" name="startDate" defaultValue={t.startDate || ''} /></div>
            </div>
            {t.monthlyFee && <p className="muted" style={{ marginTop: 10 }}>Collected up front (first + last month): <strong>{money((Number(t.monthlyFee) || 0) * 2)}</strong>. The last month is held and transfers to the end of any extension.</p>}
            {t.endDate && <p className="muted" style={{ marginTop: 6 }}>Term end (auto-calculated): <strong>{prettyDate(t.endDate)}</strong>. Renewal notice fires 30 days before.</p>}
            <div className="actions">
              <button className="btn">Save</button>
              <a className="btn blue" href={`/contract/${r.id}`} target="_blank" rel="noreferrer">Generate contract →</a>
            </div>
          </form>
        </div>
      )}

      {/* 4. Extension (shown once tenant asks to extend) */}
      {(r.status === 'extend_requested' || r.status === 'renewed') && (
        <div className="card" style={{ borderColor: 'var(--blue)' }}>
          <h2>4 · {r.status === 'renewed' ? 'Extension sent' : 'Tenant wants to extend — offer options'}</h2>
          {r.status === 'renewed' && r.extension ? (
            <>
              <div className="banner info">Offered {r.extension.months} months at {money(r.extension.monthlyFee)}/mo, effective {prettyDate(r.extension.effectiveDate)} through {prettyDate(r.extension.expirationDate)}.</div>
              <a className="btn blue" href={`/addendum/${r.id}`} target="_blank" rel="noreferrer">View addendum →</a>
            </>
          ) : (
            <form action={sendExtension}>
              <input type="hidden" name="id" value={r.id} />
              <div className="row">
                <div><label>Extension length (months)</label>
                  <select name="months" defaultValue="6">
                    <option value="3">3 months</option>
                    <option value="6">6 months</option>
                    <option value="12">12 months</option>
                  </select></div>
                <div><label>Monthly rate ($)</label>
                  <input type="number" name="monthlyFee" min="0" step="1" defaultValue={t.monthlyFee || ''} required /></div>
              </div>
              <div className="row">
                <div><label>Effective date</label><input type="date" name="effectiveDate" defaultValue={t.endDate ? addMonths(t.endDate, 0) : ''} /></div>
                <div><label>Addendum date</label><input type="date" name="agreementDate" /></div>
              </div>
              <div className="actions">
                <button className="btn blue">Email extension options + addendum →</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
