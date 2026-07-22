'use client';
import { useState } from 'react';
import SubmitButton from './SubmitButton.js';

// Customer profile: read-only summary with an Edit button that swaps to a full
// form. Saving updates the single client record every other screen reads from.
export default function ClientDetails({ rentalId, client = {}, submittedAt, signed, action }) {
  const [editing, setEditing] = useState(false);
  const p = client.property || {};

  const types = [];
  if (Number(p.boat) > 0) types.push(`Boat ×${p.boat}`);
  if (Number(p.trailer) > 0) types.push(`Trailer ×${p.trailer}`);
  if (Number(p.rv) > 0) types.push(`RV ×${p.rv}`);
  if (Number(p.vehicle) > 0) types.push(`Vehicle ×${p.vehicle}`);
  if (p.other) types.push(`Other: ${p.other}`);

  if (!editing) {
    return (
      <>
        <dl className="kv">
          <dt>Name</dt><dd>{client.name || '—'}</dd>
          <dt>Phone</dt><dd>{client.phone || '—'}</dd>
          <dt>Email</dt><dd>{client.email || '—'}</dd>
          <dt>Stored property</dt><dd>{types.join(', ') || '—'}</dd>
          <dt>Make / Model</dt><dd>{p.makeModel || '—'}</dd>
          <dt>Length (overall)</dt><dd>{p.length || '—'}</dd>
          <dt>License / Reg #</dt><dd>{p.licenseReg || '—'}</dd>
          <dt>Insurance / Policy #</dt><dd>{p.insurance || '—'}</dd>
        </dl>
        <p className="muted" style={{ marginTop: 14 }}>
          Submitted {submittedAt ? new Date(submittedAt).toLocaleString('en-US') : '—'}
          {client.lastEditedAt && <> · edited {new Date(client.lastEditedAt).toLocaleString('en-US')}</>}
        </p>
        <div className="actions">
          <button className="btn alt" onClick={() => setEditing(true)}>Edit customer</button>
        </div>
      </>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="id" value={rentalId} />

      {signed && (
        <div className="banner info">
          <strong>This agreement is already signed.</strong> Your edits update the contract details
          (contact info, vehicle, license, insurance) everywhere. The <em>signature block</em> keeps
          the name exactly as the customer typed it when signing — that&apos;s deliberate, so the
          signed record isn&apos;t altered after the fact. Perfect for fixing typos and updated
          details; if the <em>name itself</em> was wrong, re-send it for signature so the signature
          matches.
        </div>
      )}

      <fieldset className="fieldset"><legend>Contact</legend>
        <label>Full name *</label>
        <input type="text" name="name" defaultValue={client.name || ''} required />
        <div className="row">
          <div><label>Phone</label><input type="tel" name="phone" defaultValue={client.phone || ''} /></div>
          <div><label>Email</label><input type="email" name="email" defaultValue={client.email || ''} /></div>
        </div>
        <p className="muted" style={{ marginTop: 6 }}>
          The email address is what renewal notices, payment reminders and signing links go to.
        </p>
      </fieldset>

      <fieldset className="fieldset"><legend>Stored property</legend>
        <div className="row3">
          <div><label>Boats</label><input type="number" name="boat" min="0" defaultValue={p.boat ?? 0} /></div>
          <div><label>Trailers</label><input type="number" name="trailer" min="0" defaultValue={p.trailer ?? 0} /></div>
          <div><label>RVs</label><input type="number" name="rv" min="0" defaultValue={p.rv ?? 0} /></div>
          <div><label>Vehicles</label><input type="number" name="vehicle" min="0" defaultValue={p.vehicle ?? 0} /></div>
        </div>
        <label>Other (describe)</label>
        <input type="text" name="other" defaultValue={p.other || ''} placeholder="e.g. jet ski, container" />
        <label>Make / Model</label>
        <input type="text" name="makeModel" defaultValue={p.makeModel || ''} />
        <label>Length (overall)</label>
        <input type="text" name="length" defaultValue={p.length || ''} placeholder="e.g. 24 ft" />
        <label>License / Registration #</label>
        <input type="text" name="licenseReg" defaultValue={p.licenseReg || ''} />
        <label>Insurance Carrier / Policy #</label>
        <input type="text" name="insurance" defaultValue={p.insurance || ''} />
      </fieldset>

      <div className="actions">
        <SubmitButton className="btn blue" pendingText="Saving…">Save changes</SubmitButton>
        <button type="button" className="btn ghost" onClick={() => setEditing(false)}>Cancel</button>
      </div>
    </form>
  );
}
