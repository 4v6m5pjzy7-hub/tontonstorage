// Renders the TonTon Trailer Rentals storage agreement as printable HTML,
// filling in client-submitted details and provider-selected term/rate.
// Legal text mirrors "STORAGE LOT v2" (Version 1.3, February 2026).

const { esc } = require('./util');

const TERM_LABELS = {
  'month-to-month': 'Month-to-month',
  'fixed-3': 'Fixed - 3 month',
  'fixed-6': 'Fixed - 6 month',
  'fixed-12': 'Fixed - 12 month',
};

function money(v) {
  if (v === undefined || v === null || v === '') return '__________';
  const n = Number(v);
  return isNaN(n) ? esc(v) : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function line(v) {
  return v && String(v).trim() ? esc(v) : '________________________';
}

function box(checked) {
  return checked ? '<strong>[X]</strong>' : '[&nbsp;&nbsp;]';
}

function renderContract(r) {
  const c = r.client || {};
  const t = r.terms || {};
  const p = c.property || {};

  const propTypes = [];
  if (Number(p.boat) > 0) propTypes.push(`Boat (${p.boat})`);
  if (Number(p.trailer) > 0) propTypes.push(`Trailer (${p.trailer})`);
  if (Number(p.rv) > 0) propTypes.push(`RV (${p.rv})`);
  if (Number(p.vehicle) > 0) propTypes.push(`Vehicle (${p.vehicle})`);
  if (p.other && p.other.trim()) propTypes.push(`Other: ${p.other}`);

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Storage Agreement - ${line(c.name)}</title>
<style>
  @page { margin: 0.75in; }
  body { font-family: "Times New Roman", Georgia, serif; font-size: 12pt; line-height: 1.5; color: #111; max-width: 8in; margin: 0 auto; padding: 24px; }
  h1 { font-size: 16pt; text-align: center; margin-bottom: 2px; }
  h2 { font-size: 12pt; margin-top: 18px; }
  .sub { text-align: center; margin-bottom: 18px; }
  .party { margin: 8px 0; }
  .fill { border-bottom: 1px solid #111; padding: 0 4px; }
  .sig { margin-top: 8px; }
  .initials { margin-top: 14px; font-size: 11pt; }
  .noprint { margin: 16px 0; text-align: center; }
  @media print { .noprint { display: none; } body { padding: 0; } }
  hr { border: none; border-top: 1px solid #ccc; margin: 20px 0; }
</style></head>
<body>
  <div class="noprint">
    <button onclick="window.print()" style="padding:10px 20px;font-size:14px;cursor:pointer;">Print / Save as PDF</button>
    <a href="/admin/${esc(r.id)}" style="margin-left:12px;">&larr; Back to file</a>
  </div>

  <h1>STORAGE LOT - TENANT AGREEMENT</h1>
  <div class="sub">1001 NW 12th Avenue, Pompano Beach, FL 33069</div>

  <p>This Storage Lot Agreement ("Agreement") is entered into as of <span class="fill">${line(t.agreementDate)}</span>, by and between:</p>

  <p class="party"><strong>Storage Provider:</strong><br>
  TonTon Trailer Rentals LLC ("Provider")<br>
  954-298-7794<br>
  info@thetrailerteam.com</p>

  <p class="party"><strong>Storage Tenant:</strong><br>
  Name: <span class="fill">${line(c.name)}</span><br>
  Phone: <span class="fill">${line(c.phone)}</span><br>
  Email: <span class="fill">${line(c.email)}</span></p>

  <h2>1. Stored Property</h2>
  <p>Type (Quantity): <span class="fill">${propTypes.length ? esc(propTypes.join(', ')) : '________________________'}</span><br>
  Make / Model: <span class="fill">${line(p.makeModel)}</span><br>
  Length (overall): <span class="fill">${line(p.length)}</span><br>
  License / Registration #: <span class="fill">${line(p.licenseReg)}</span><br>
  Insurance Carrier / Policy #: <span class="fill">${line(p.insurance)}</span></p>
  <p>No substitution of equipment without Provider approval.</p>

  <h2>2. Storage Space &amp; Location</h2>
  <p>Property will be stored at a commercial storage yard in Pompano Beach, Florida. No specific space is guaranteed. This Agreement grants storage only and does not convey possession or tenancy rights. Provider may reposition stored property as required for safety or operations.</p>

  <h2>3. Term &amp; Payment</h2>
  <p>Term Type: ${box(t.termType === 'month-to-month')} Month-to-month
     ${box(t.termType === 'fixed-3')} Fixed-3 month
     ${box(t.termType === 'fixed-6')} Fixed-6 month
     ${box(t.termType === 'fixed-12')} Fixed-12 month</p>
  <p>Monthly storage fee: $<span class="fill">${money(t.monthlyFee)}</span> / month<br>
  Payment: ${box(t.paymentSchedule === 'monthly')} Monthly ${box(t.paymentSchedule === 'prepaid')} Prepaid
     &nbsp; Start / Dates: <span class="fill">${line(t.startDate)}</span></p>
  <p>Payment Method: ${box(t.paymentMethod === 'cash')} Cash
     ${box(t.paymentMethod === 'zelle')} Zelle
     ${box(t.paymentMethod === 'card')} Card (plus 3% processing fee)</p>
  <p>Late Payment: Payments not received within five (5) days of the due date will incur a $25 late fee, plus $5 per day thereafter, not to exceed $150 per month. Provider may suspend access until all past-due amounts are paid in full. No refunds for partial months unless approved in writing.</p>
  <p class="initials">Tenant Initials: ________</p>

  <h2>4. Permitted Use</h2>
  <p>Storage only. No living, sleeping, camping, business operations, repairs, maintenance, signage, or subleasing. Property must remain clean, insured, and operational at all times.</p>

  <h2>5. Access</h2>
  <p>Access by appointment only. No guaranteed hours. Provider may restrict access due to safety, weather, non-payment, or operational needs.</p>
  <p>Keys &amp; Access Devices: Tenant shall not provide keys, gate codes, or access credentials to any third party without Provider's approval.</p>

  <h2>6. Insurance &amp; Risk</h2>
  <p>Tenant shall maintain active insurance on stored property. All property is stored entirely at Tenant's risk. Provider is not responsible for loss, theft, vandalism, fire, weather, or damage of any kind.</p>

  <h2>7. Indemnification</h2>
  <p>Tenant agrees to indemnify and hold harmless Provider from any claims, damages, losses, or expenses arising from Tenant's property or actions.</p>

  <h2>8. No Bailment / No Landlord-Tenant Relationship</h2>
  <p>This Agreement does not create a bailment, leasehold, or landlord-tenant relationship. Provider does not assume care, custody, or control of stored property and retains full control of the premises at all times.</p>

  <h2>9. Termination</h2>
  <p><em>Month-to-Month Agreements:</em> Either party may terminate a month-to-month storage agreement without cause by providing thirty (30) days' written notice.</p>
  <p><em>Fixed-Term Agreements:</em> If this Agreement is entered as a fixed-term storage arrangement (including but not limited to three (3), six (6), or twelve (12) months), the Agreement shall remain in effect for the entire stated term. Tenant may not terminate a fixed-term Agreement early for convenience, and early removal of stored property does not terminate the Agreement or relieve Tenant of payment obligations for the full term.</p>
  <p><em>Provider Termination:</em> Provider may terminate this Agreement immediately for non-payment, insurance lapse, unauthorized use, or safety concerns. Upon termination for any reason, Tenant shall remove stored property within the timeframe designated by Provider. This Section controls over any inconsistent termination language elsewhere in this Agreement.</p>
  <p class="initials">Tenant Initials: ________</p>

  <h2>10. Master Lease Termination / Loss of Premises</h2>
  <p>In the event Provider's underlying lease, license, or right to use the storage yard is terminated, revoked, or otherwise lost for any reason, this Agreement shall automatically terminate without penalty to Provider. Tenant agrees to remove stored property within a reasonable period designated by Provider. Provider shall not be liable for relocation costs, damages, or losses arising from such termination. Any prepaid rent beyond the termination date shall be prorated and refunded.</p>

  <h2>11. Abandoned Property</h2>
  <p>Property remaining more than thirty (30) days after termination without written extension may be deemed abandoned and handled in accordance with Florida law at Tenant's expense.</p>

  <h2>12. Governing Law</h2>
  <p>This Agreement shall be governed by the laws of the State of Florida.</p>

  <h2>13. Entire Agreement</h2>
  <p>This document constitutes the entire agreement between the parties and may only be modified in writing signed by both parties.</p>
  <p class="initials">Tenant Initials: ________</p>

  <p class="sig">Tenant Signature: <span class="fill">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
     Date: <span class="fill">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></p>
  <p class="sig">Provider Signature: <span class="fill">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
     Date: <span class="fill">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></p>

  <hr>
  <p style="font-size:9pt;color:#666;">Version 1.3 - February 2026 &nbsp;&middot;&nbsp; Term: ${esc(TERM_LABELS[t.termType] || 'not set')} &nbsp;&middot;&nbsp; Generated ${new Date().toLocaleDateString('en-US')}</p>
</body></html>`;
}

module.exports = { renderContract, TERM_LABELS };
