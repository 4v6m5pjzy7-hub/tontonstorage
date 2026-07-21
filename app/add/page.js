import Link from 'next/link';
import { requireAuth } from '../auth.js';
import { addExistingRental } from '../actions.js';
import SubmitButton from '../SubmitButton.js';
import { LOCATIONS } from '../../lib/format.js';

export const dynamic = 'force-dynamic';

// Straight-in entry for customers Anton already has on paper, so they don't
// have to go through the intake-link flow.
export default function AddExisting() {
  requireAuth();
  return (
    <div className="wrap">
      <p><Link href="/">← Rentals</Link></p>
      <h1>Add an existing customer</h1>
      <p className="lead">
        For customers already storing with you. This skips the intake link and creates the
        rental straight away. You can add or change anything afterwards.
      </p>

      <form action={addExistingRental}>
        <div className="card">
          <h2>Customer</h2>
          <label>Full name *</label>
          <input type="text" name="name" required />
          <div className="row">
            <div><label>Phone</label><input type="tel" name="phone" /></div>
            <div><label>Email</label><input type="email" name="email" placeholder="needed for payment reminders" /></div>
          </div>
        </div>

        <div className="card">
          <h2>Location</h2>
          <div className="row">
            <div><label>Yard</label>
              <select name="location" defaultValue="">
                <option value="">Unassigned</option>
                {LOCATIONS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
              </select>
            </div>
            <div><label>Spot #</label><input type="text" name="spot" placeholder="e.g. E-04" /></div>
          </div>
        </div>

        <div className="card">
          <h2>What they store</h2>
          <div className="row">
            <div><label>Make / Model</label><input type="text" name="makeModel" placeholder="e.g. Mercedes Sprinter" /></div>
            <div><label>Length</label><input type="text" name="length" placeholder="e.g. 24 ft" /></div>
          </div>
          <div className="row">
            <div><label>License / Reg #</label><input type="text" name="licenseReg" /></div>
            <div><label>Insurance / Policy #</label><input type="text" name="insurance" /></div>
          </div>
        </div>

        <div className="card">
          <h2>Term &amp; rate</h2>
          <div className="row">
            <div><label>Term type *</label>
              <select name="termType" defaultValue="month-to-month" required>
                <option value="month-to-month">Month-to-month</option>
                <option value="fixed-3">Fixed - 3 month</option>
                <option value="fixed-6">Fixed - 6 month</option>
                <option value="fixed-12">Fixed - 12 month</option>
              </select>
            </div>
            <div><label>Monthly rate ($) *</label>
              <input type="number" name="monthlyFee" min="0" step="0.01" required /></div>
          </div>
          <div className="row">
            <div><label>Start date *</label><input type="date" name="startDate" required /></div>
            <div><label>Payment schedule</label>
              <select name="paymentSchedule" defaultValue="monthly">
                <option value="monthly">Monthly</option>
                <option value="prepaid">Prepaid (no monthly reminders)</option>
              </select>
            </div>
          </div>
          <div className="row">
            <div><label>Payment method</label>
              <select name="paymentMethod" defaultValue="cash">
                <option value="cash">Cash</option>
                <option value="zelle">Zelle</option>
                <option value="card">Card (+3%)</option>
                <option value="check">Check</option>
              </select>
            </div>
            <div />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, fontWeight: 600 }}>
            <input type="checkbox" name="alreadySigned" defaultChecked style={{ width: 'auto' }} />
            They already have a signed agreement on file
          </label>
          <p className="muted" style={{ marginTop: 4 }}>
            Leave ticked for existing customers so they land in <strong>Signed, not paid</strong> rather than
            the chase-a-signature stages. Untick if you still need them to sign.
          </p>
          <div className="actions">
            <SubmitButton className="btn blue" pendingText="Adding…">Add customer</SubmitButton>
          </div>
        </div>
      </form>
    </div>
  );
}
