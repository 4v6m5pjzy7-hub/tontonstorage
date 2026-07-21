import { getSupabase, supabaseConfigured } from '../../../lib/supabase.js';
import { signContract } from '../../actions.js';
import SignaturePad from '../../SignaturePad.js';
import SubmitButton from '../../SubmitButton.js';
import { money, prettyDate, TERM_LABELS, dueAtSigning } from '../../../lib/format.js';

export const dynamic = 'force-dynamic';

export default async function Sign({ params, searchParams }) {
  if (!supabaseConfigured()) return null;
  const sb = getSupabase();
  const { data: r } = await sb.from('rentals').select('*').eq('token', params.token).is('deleted_at', null).single();

  if (!r) {
    return (
      <div className="wrap"><div className="card">
        <h1>This link is not valid</h1>
        <p className="muted">Please contact TonTon Trailer Rentals at 954-298-7794.</p>
      </div></div>
    );
  }

  const c = r.client || {};
  const t = r.terms || {};
  const due = dueAtSigning(t);
  const agreementUrl = `/agreement/${r.token}`;

  if (!c.name || !t.monthlyFee) {
    return (
      <div className="wrap"><div className="card">
        <h1>Not ready yet</h1>
        <p className="lead">Your agreement isn&apos;t prepared yet. TonTon Trailer Rentals will email you as soon as it is.</p>
      </div></div>
    );
  }

  // Already signed
  if (t.signature?.signedAt) {
    return (
      <div className="wrap">
        <div className="card" style={{ textAlign: 'center', padding: '36px 24px' }}>
          <div style={{
            width: 62, height: 62, borderRadius: '50%', background: '#e5f5ec',
            color: 'var(--ok)', fontSize: 34, lineHeight: '62px', margin: '0 auto 14px',
          }}>&#10003;</div>
          <h1 style={{ marginBottom: 6 }}>Agreement signed</h1>
          <p className="lead">
            Thanks, {c.name}. You signed on {prettyDate(t.signedAt)}. A copy was emailed to {c.email}.
          </p>
          <a className="btn blue" href={agreementUrl} target="_blank" rel="noreferrer" style={{ marginTop: 10 }}>
            View / print your agreement
          </a>
          <p className="muted" style={{ marginTop: 16 }}>Questions? Call 954-298-7794.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="card">
        <h1>Your storage agreement</h1>
        <p className="lead">
          Hi {c.name}, please review your agreement below and sign at the bottom. No printing or scanning needed.
        </p>

        <dl className="kv" style={{ background: '#f2f5fa', borderRadius: 10, padding: '14px 16px' }}>
          <dt>Stored property</dt><dd>{[t && c.property?.makeModel, c.property?.length].filter(Boolean).join(', ') || '—'}</dd>
          <dt>Term</dt><dd>{TERM_LABELS[t.termType] || '—'}</dd>
          {t.termStart && t.endDate && (<><dt>Term dates</dt><dd>{prettyDate(t.termStart)} to {prettyDate(t.endDate)}</dd></>)}
          <dt>Monthly rate</dt><dd>{money(t.monthlyFee)} / month</dd>
          <dt style={{ fontWeight: 700 }}>Due at signing</dt><dd style={{ fontWeight: 700 }}>{money(due.total)}</dd>
        </dl>

        <p className="muted" style={{ marginTop: 14 }}>
          Full agreement (scroll to read, or <a href={agreementUrl} target="_blank" rel="noreferrer">open in a new tab</a>):
        </p>
        <iframe
          src={agreementUrl}
          title="Storage agreement"
          style={{ width: '100%', height: 460, border: '1px solid var(--line)', borderRadius: 10, background: '#fff' }}
        />
      </div>

      <div className="card">
        <h2>Sign here</h2>
        {searchParams?.e === 'name' && <div className="banner err">Please type your full legal name.</div>}
        {searchParams?.e === 'sig' && <div className="banner err">Please draw your signature in the box.</div>}
        {searchParams?.e === 'agree' && <div className="banner err">Please tick the box to agree before signing.</div>}

        <form action={signContract}>
          <input type="hidden" name="token" value={r.token} />

          <label>Type your full legal name *</label>
          <input type="text" name="signerName" defaultValue={c.name || ''} required />

          <label style={{ marginTop: 16 }}>Draw your signature *</label>
          <SignaturePad />

          <label className="consent">
            <input type="checkbox" name="agree" />
            <span>
              I have read and agree to the Storage Lot Tenant Agreement above, and I intend this
              electronic signature to be the legal equivalent of my handwritten signature.
            </span>
          </label>

          <SubmitButton
            className="btn blue"
            style={{ marginTop: 18, width: '100%', padding: '14px 22px', fontSize: 16 }}
            pendingText="Signing, please wait…"
          >
            Sign agreement
          </SubmitButton>
          <p className="muted" style={{ textAlign: 'center', marginTop: 8 }}>
            Your name, signature, date, and IP address are recorded for this agreement.
          </p>
        </form>
      </div>
    </div>
  );
}
