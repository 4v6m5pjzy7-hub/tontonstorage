import SubmitButton from './SubmitButton.js';

// Shared intake form. Used by both the per-customer link (/intake/[token],
// updates one record) and the generic public link (/apply, creates a new
// record every time). Pass `token` only for the per-customer flow.
export default function IntakeForm({ action, token }) {
  return (
    <div className="card">
      <h1>Storage Intake Form</h1>
      <p className="lead">Fill in your details below. This goes straight to TonTon Trailer Rentals to prepare your storage agreement. Fields marked * are required.</p>
      <form action={action}>
        {token ? <input type="hidden" name="token" value={token} /> : null}

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
  );
}
