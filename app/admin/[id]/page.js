import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabase, supabaseConfigured } from '../../../lib/supabase.js';
import { saveContactAndSend, saveTerms, sendExtension, confirmPayment, saveContractProgress, deleteRental, setLocation, sendSignRequest, providerSign } from '../../actions.js';
import DeleteButton from '../../DeleteButton.js';
import SubmitButton from '../../SubmitButton.js';
import TermCalculator from '../../TermCalculator.js';
import SignaturePad from '../../SignaturePad.js';
import { StatusPill } from '../../ui.js';
import CopyButton from '../../CopyButton.js';
import { emailConfigured } from '../../../lib/email.js';
import { TERM_LABELS, money, prettyDate, addMonths, dueAtSigning, LOCATIONS } from '../../../lib/format.js';
import { requireAuth } from '../../auth.js';

export const dynamic = 'force-dynamic';

function appUrl() {
  return (process.env.APP_URL || 'http://localhost:3500').replace(/\/+$/, '');
}

export default async function AdminFile({ params, searchParams }) {
  requireAuth();
  if (!supabaseConfigured()) notFound();
  const sb = getSupabase();
  const { data: r } = await sb.from('rentals').select('*').eq('id', params.id).single();
  if (!r) notFound();

  const link = `${appUrl()}/intake/${r.token}`;
  const c = r.client;
  const p = c?.property || {};
  const t = r.terms || {};
  const due = dueAtSigning(t);
  const contact = r.contact || {};

  const banner =
    searchParams?.sent === '1' ? <div className="banner ok">Intake link emailed to the client.</div> :
    searchParams?.ext === '1' ? <div className="banner ok">Extension addendum emailed to the tenant.</div> :
    searchParams?.paid === '1' ? <div className="banner ok">Payment recorded and confirmation emailed to the customer.</div> :
    searchParams?.saved === '1' ? <div className="banner ok">Contract status saved.</div> :
    searchParams?.sent_sign === '1' ? <div className="banner ok">Signing link emailed to the customer.</div> :
    searchParams?.executed === '1' ? <div className="banner ok">Agreement fully executed. Executed copy emailed to the customer.</div> :
    searchParams?.added === '1' ? <div className="banner ok">Customer added. Review the details below.</div> :
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

      {/* 0. Yard location */}
      <div className="card">
        <h2>Location</h2>
        <form action={setLocation}>
          <input type="hidden" name="id" value={r.id} />
          <div className="row">
            <div><label>Yard</label>
              <select name="location" defaultValue={r.location || ''}>
                <option value="">Unassigned</option>
                {LOCATIONS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
              </select>
            </div>
            <div><label>Spot #</label><input type="text" name="spot" defaultValue={r.spot || ''} placeholder="e.g. E-04" /></div>
          </div>
          <p className="muted" style={{ marginTop: 6 }}>Internal only. This never appears on the customer&apos;s contract.</p>
          <div className="actions"><button className="btn alt">Save location</button></div>
        </form>
      </div>

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
          <TermCalculator rentalId={r.id} terms={t} contractHref={`/contract/${r.id}`} action={saveTerms} />
          {t.termStart && t.endDate && (
            <p className="muted" style={{ marginTop: 10 }}>
              Saved term runs <strong>{prettyDate(t.termStart)}</strong> to <strong>{prettyDate(t.endDate)}</strong>. Renewal notice fires 30 days before.
            </p>
          )}
          {!t.termStart && t.endDate && (
            <p className="muted" style={{ marginTop: 10 }}>Saved term end: <strong>{prettyDate(t.endDate)}</strong>. Renewal notice fires 30 days before.</p>
          )}
        </div>
      )}

      {/* 3a. Contract, signing and special provisions */}
      {c && !t.monthlyFee && (
        <div className="card">
          <h2>Contract &amp; signing</h2>
          <div className="banner info">
            Set the term &amp; rate above and press <strong>Save</strong> first. Once saved, the
            <strong> Email for signature</strong> button and signing tools appear here.
          </div>
        </div>
      )}
      {c && t.monthlyFee && (
        <div className="card">
          <h2>Contract &amp; signing</h2>
          <form action={saveContractProgress}>
            <input type="hidden" name="id" value={r.id} />
            <div className="row">
              <div><label>Contract sent to customer on</label>
                <input type="date" name="contractSentAt" defaultValue={t.contractSentAt || ''} /></div>
              <div><label>Signed copy received on</label>
                <input type="date" name="signedAt" defaultValue={t.signedAt || ''} /></div>
            </div>

            <label style={{ marginTop: 16 }}>Special provisions (one per line)</label>
            <textarea
              name="specialProvisions"
              rows={4}
              defaultValue={t.specialProvisions || ''}
              placeholder={'Tenant is permitted to perform welding and repair work on stored barges.\nProvider approval is not required for routine maintenance of Tenant’s equipment.'}
            />
            <p className="muted" style={{ marginTop: 6 }}>
              Anything you put here prints at the bottom of the contract as <strong>Section 14 - Special Provisions</strong> and
              legally <strong>overrides any conflicting section</strong> above it. Use it to grant exceptions
              (for example allowing repairs that Permitted Use would otherwise prohibit).
            </p>

            <div className="actions">
              <button className="btn">Save contract status</button>
              <a className="btn alt" href={`/contract/${r.id}`} target="_blank" rel="noreferrer">Preview contract →</a>
            </div>
          </form>

          <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '20px 0' }} />

          {t.signature?.signedAt ? (
            <>
              <div className="banner ok">
                Signed electronically by <strong>{t.signature.name}</strong> on {prettyDate(t.signedAt)}
                {t.signature.ip ? ` (IP ${t.signature.ip})` : ''}.
              </div>

              {t.providerSignature?.signedAt ? (
                <div className="banner ok">
                  Countersigned by <strong>{t.providerSignature.name}</strong> on {prettyDate(t.executedAt)}.
                  Fully executed — the executed copy was emailed to {c.email}.
                </div>
              ) : (
                <div style={{ border: '2px solid var(--blue)', borderRadius: 10, padding: 16, marginTop: 4 }}>
                  <h3 style={{ margin: '0 0 6px', color: 'var(--navy)', fontSize: 16 }}>Your turn to sign</h3>
                  <p className="muted" style={{ marginTop: 0 }}>
                    The customer has signed. Countersign below to fully execute it — the executed copy
                    is emailed to them automatically.
                  </p>
                  {searchParams?.e === 'sig' && <div className="banner err">Please draw a signature first.</div>}
                  <form action={providerSign}>
                    <input type="hidden" name="id" value={r.id} />
                    <label>Signing as</label>
                    <input type="text" name="signerName" defaultValue="Anton Bajada Leonardes" />
                    <label style={{ marginTop: 14 }}>Signature</label>
                    <SignaturePad />
                    <div className="actions">
                      <SubmitButton className="btn blue" pendingText="Executing…">
                        Countersign &amp; send executed copy →
                      </SubmitButton>
                    </div>
                  </form>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="muted" style={{ marginBottom: 10 }}>
                <strong>Send it for e-signature.</strong> The customer gets a link, reads the agreement on
                their phone, signs with their finger, and it comes straight back. No printing or scanning.
              </p>
              <form action={sendSignRequest}>
                <input type="hidden" name="id" value={r.id} />
                <SubmitButton className="btn blue" pendingText="Sending…">Email for signature →</SubmitButton>
              </form>
            </>
          )}
          <p className="muted" style={{ marginTop: 10 }}>
            Signing link: <code style={{ fontSize: 12 }}>{appUrl()}/sign/{r.token}</code>
          </p>
        </div>
      )}

      {/* 3b. Payment received */}
      {c && t.monthlyFee && (
        <div className="card">
          <h2>Payment received</h2>
          {t.payment?.paidAt ? (
            <>
              <div className="banner ok">
                Paid {money(t.payment.amount)} on {prettyDate(t.payment.paidAt)}
                {t.payment.method ? ` (${t.payment.method})` : ''}. Confirmation emailed to {c.email}.
              </div>
              <p className="muted">Need to correct it? Re-submit below and a new confirmation will be sent.</p>
            </>
          ) : (
            <p className="muted">Once the signed contract and payment come back, record it here and we&apos;ll email the customer a confirmation with their agreement details.</p>
          )}
          <form action={confirmPayment}>
            <input type="hidden" name="id" value={r.id} />
            <div className="row">
              <div><label>Date paid</label><input type="date" name="paidAt" defaultValue={t.payment?.paidAt || ''} required /></div>
              <div><label>Amount paid ($)</label>
                <input type="number" name="amountPaid" min="0" step="0.01" defaultValue={t.payment?.amount || due.total.toFixed(2)} required /></div>
            </div>
            <div className="row">
              <div><label>Method</label>
                <select name="paidMethod" defaultValue={t.payment?.method || 'zelle'}>
                  <option value="Cash">Cash</option>
                  <option value="Zelle">Zelle</option>
                  <option value="Card">Card</option>
                  <option value="Check">Check</option>
                </select></div>
              <div><label>Note (optional)</label><input type="text" name="paidNote" defaultValue={t.payment?.note || ''} placeholder="e.g. paid in full" /></div>
            </div>
            <div className="actions">
              <button className="btn blue">Send payment confirmation →</button>
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

      {/* Delete */}
      <div className="card danger-zone">
        <h2 style={{ color: '#b3261e' }}>Delete this rental</h2>
        <p className="muted">
          Use this if the customer never signed or backed out. It moves to <strong>Recently deleted</strong>,
          where it stays restorable for 30 days with the contract and any signatures intact, then is
          removed automatically.
        </p>
        <form action={deleteRental} style={{ marginTop: 12 }}>
          <input type="hidden" name="id" value={r.id} />
          <DeleteButton name={c?.name || ''} />
        </form>
      </div>
    </div>
  );
}
