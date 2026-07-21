import { notFound } from 'next/navigation';
import { getSupabase, supabaseConfigured } from '../../../lib/supabase.js';
import { submitIntake } from '../../actions.js';
import SubmitButton from '../../SubmitButton.js';

export const dynamic = 'force-dynamic';

export default async function Intake({ params }) {
  if (!supabaseConfigured()) notFound();
  const sb = getSupabase();
  const { data: r } = await sb.from('rentals').select('*').eq('token', params.token).single();
  if (!r) {
    return (
      <div className="wrap"><div className="card">
        <h1>This link is not valid</h1>
        <p className="muted">Please contact TonTon Trailer Rentals for a new link. 954-298-7794</p>
      </div></div>
    );
  }

  if (r.client) {
    return (
      <div className="wrap">
        <div className="card" style={{ textAlign: 'center', padding: '36px 24px' }}>
          <div style={{
            width: 62, height: 62, borderRadius: '50%', background: '#e5f5ec',
            color: 'var(--ok)', fontSize: 34, lineHeight: '62px', margin: '0 auto 14px',
          }}>&#10003;</div>
          <h1 style={{ marginBottom: 6 }}>Submitted successfully</h1>
          <p className="lead" style={{ marginBottom: 18 }}>
            Thanks, {r.client.name}! We&apos;ve got your details and we&apos;ll be in touch shortly
            with your storage agreement.
          </p>
          <div className="banner ok" style={{ textAlign: 'left' }}>
            <strong>Nothing else to do right now.</strong> You don&apos;t need to submit again.
            TonTon Trailer Rentals will email you at {r.client.email}.
          </div>
          <p className="muted" style={{ marginTop: 16 }}>Questions? Call 954-298-7794.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="card">
        <h1>Storage Intake Form</h1>
        <p className="lead">Fill in your details below. This goes straight to TonTon Trailer Rentals to prepare your storage agreement. Fields marked * are required.</p>
        <form action={submitIntake}>
          <input type="hidden" name="token" value={r.token} />

          <fieldset className="fieldset"><legend>Your contact</legend>
            <label>Full name *</label><input type="text" name="name" required />
            <div className="row">
              <div><label>Phone *</label><input type="tel" name="phone" required /></div>
              <div><label>Email *</label><input type="email" name="email" required /></div>
            </div>
          </fieldset>

          <fieldset className="fieldset"><legend>What you&apos;re storing</legend>
            <p className="muted" style={{ margin: '6px 0 0' }}>Enter a quantity for each type (leave at 0 if none).</p>
            <div className="row3">
              <div><label>Boats</label><input type="number" name="boat" min="0" defaultValue="0" /></div>
              <div><label>Trailers</label><input type="number" name="trailer" min="0" defaultValue="0" /></div>
              <div><label>RVs</label><input type="number" name="rv" min="0" defaultValue="0" /></div>
              <div><label>Vehicles</label><input type="number" name="vehicle" min="0" defaultValue="0" /></div>
            </div>
            <label>Other (describe)</label><input type="text" name="other" placeholder="e.g. jet ski, container" />
            <label>Make / Model *</label><input type="text" name="makeModel" required />
            <label>Length (overall) *</label><input type="text" name="length" placeholder="e.g. 24 ft" required />
            <label>License / Registration #</label><input type="text" name="licenseReg" />
            <label>Insurance Carrier / Policy #</label><input type="text" name="insurance" />
          </fieldset>

          <p className="muted">By submitting, you confirm this information is accurate. Final term, rate, and agreement will be provided by TonTon Trailer Rentals.</p>
          <SubmitButton
            className="btn blue"
            style={{ marginTop: 8, width: '100%', padding: '14px 22px', fontSize: 16 }}
            pendingText="Submitting, please wait…"
          >
            Submit my information
          </SubmitButton>
          <p className="muted" style={{ textAlign: 'center', marginTop: 8 }}>This can take a few seconds. Please tap once.</p>
        </form>
      </div>
    </div>
  );
}
