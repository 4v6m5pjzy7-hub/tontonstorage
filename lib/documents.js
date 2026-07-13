import { esc, docHead, docFooter, DOC_STYLES } from './branding.js';
import { money, dollarsInWords, prettyDate, TERM_LABELS } from './format.js';

function line(v) {
  return v && String(v).trim() ? esc(v) : '________________________';
}
function box(checked) {
  return checked ? '<span class="box">&#9746;</span>' : '<span class="box">&#9744;</span>';
}
function propertyList(p = {}) {
  const out = [];
  if (Number(p.boat) > 0) out.push(`Boat (${esc(p.boat)})`);
  if (Number(p.trailer) > 0) out.push(`Trailer (${esc(p.trailer)})`);
  if (Number(p.rv) > 0) out.push(`RV (${esc(p.rv)})`);
  if (Number(p.vehicle) > 0) out.push(`Vehicle (${esc(p.vehicle)})`);
  if (p.other && p.other.trim()) out.push(`Other: ${esc(p.other)}`);
  return out.join(', ') || '________________________';
}

function shell(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
  <style>${DOC_STYLES}</style></head><body>
  <div class="noprint">
    <button onclick="window.print()" style="padding:10px 22px;font-size:14px;cursor:pointer;background:#12356b;color:#fff;border:none;border-radius:8px;">Print / Save as PDF</button>
  </div>
  ${body}
  </body></html>`;
}

// ---------------- Original Storage Lot Agreement ----------------
export function renderContract(r) {
  const c = r.client || {};
  const p = c.property || {};
  const t = r.terms || {};

  const body = `${docHead('STORAGE LOT - TENANT AGREEMENT')}
  <p class="intro">This Storage Lot Agreement ("Agreement") is entered into as of <span class="fill">${prettyDate(t.agreementDate)}</span>, by and between:</p>

  <div class="cols">
    <div>
      <div class="party-h">STORAGE PROVIDER:</div>
      TonTon Trailer Rentals LLC - Storage Division<br>
      1001 NW 12th Ave, Pompano Beach, FL 33069<br>954-298-7794 &middot; info@thetrailerteam.com
      <div class="party-h" style="margin-top:12px;">STORAGE TENANT:</div>
      Name: ${line(c.name)}<br>Phone: ${line(c.phone)}<br>Email: ${line(c.email)}
    </div>
    <div>
      <div class="party-h">STORED PROPERTY:</div>
      Type (Qty): ${propertyList(p)}<br>
      Make / Model: ${line(p.makeModel)}<br>
      Length (overall): ${line(p.length)}<br>
      License / Registration #: ${line(p.licenseReg)}<br>
      Insurance Carrier / Policy #: ${line(p.insurance)}
      <p style="font-style:italic;color:#556;">No substitution of equipment without Provider approval.</p>
    </div>
  </div>

  <h2>1. Stored Property</h2>
  <p>No substitution of equipment without Provider approval.</p>

  <h2>2. Storage Space &amp; Location</h2>
  <p>Property will be stored at a commercial storage yard in Pompano Beach, Florida. No specific space is guaranteed. This Agreement grants storage only and does not convey possession or tenancy rights. Provider may reposition stored property as required for safety or operations.</p>

  <h2>3. Term &amp; Payment</h2>
  <p>Term Type: ${box(t.termType === 'month-to-month')} Month-to-month &nbsp; ${box(t.termType === 'fixed-3')} Fixed-3 month &nbsp; ${box(t.termType === 'fixed-6')} Fixed-6 month &nbsp; ${box(t.termType === 'fixed-12')} Fixed-12 month</p>
  <p>Monthly storage fee: <span class="fill">${money(t.monthlyFee)}</span> / month<br>
  Payment: ${box(t.paymentSchedule === 'monthly')} Monthly &nbsp; ${box(t.paymentSchedule === 'prepaid')} Prepaid &nbsp; Start / Dates: <span class="fill">${prettyDate(t.startDate)}</span><br>
  Payment Method: ${box(t.paymentMethod === 'cash')} Cash &nbsp; ${box(t.paymentMethod === 'zelle')} Zelle &nbsp; ${box(t.paymentMethod === 'card')} Card (plus 3% processing fee)</p>
  <p><strong>Advance Payment (First &amp; Last Month):</strong> Tenant shall pay the first month and the last month of storage in advance upon execution of this Agreement, totaling <span class="fill">${money((Number(t.monthlyFee) || 0) * 2)}</span> (two months at the monthly storage fee above). The last month's payment shall be held by Provider as prepaid rent and applied to the final month of the storage term. In the event the term is extended by any addendum or written agreement, the prepaid last month's rent shall automatically transfer to and be applied against the final month of the extension period, and shall not be applied at the end of the original term.</p>
  <p>Late Payment: Payments not received within five (5) days of the due date will incur a $25 late fee, plus $5 per day thereafter, not to exceed $150 per month. Provider may suspend access until all past-due amounts are paid in full. No refunds for partial months unless approved in writing.</p>
  <p style="font-size:10pt;">Tenant Initials: ________</p>

  <h2>4. Permitted Use</h2>
  <p>Storage only. No living, sleeping, camping, business operations, repairs, maintenance, signage, or subleasing. Property must remain clean, insured, and operational at all times.</p>
  <h2>5. Access</h2>
  <p>No guaranteed hours. Provider may restrict access due to safety, weather, non-payment, or operational needs. Tenant shall not provide keys, gate codes, or access credentials to any third party without Provider's approval.</p>
  <h2>6. Insurance &amp; Risk</h2>
  <p>Tenant shall maintain active insurance on stored property. All property is stored entirely at Tenant's risk. Provider is not responsible for loss, theft, vandalism, fire, weather, or damage of any kind.</p>
  <h2>7. Indemnification</h2>
  <p>Tenant agrees to indemnify and hold harmless Provider from any claims, damages, losses, or expenses arising from Tenant's property or actions.</p>
  <h2>8. No Bailment / No Landlord-Tenant Relationship</h2>
  <p>This Agreement does not create a bailment, leasehold, or landlord-tenant relationship. Provider does not assume care, custody, or control of stored property and retains full control of the premises at all times.</p>
  <h2>9. Termination</h2>
  <p><em>Month-to-Month Agreements:</em> Either party may terminate a month-to-month storage agreement without cause by providing thirty (30) days' written notice.</p>
  <p><em>Fixed-Term Agreements:</em> A fixed-term Agreement (including three (3), six (6), or twelve (12) months) shall remain in effect for the entire stated term. Tenant may not terminate early for convenience, and early removal does not relieve Tenant of payment obligations for the full term.</p>
  <p><em>Provider Termination:</em> Provider may terminate immediately for non-payment, insurance lapse, unauthorized use, or safety concerns. Upon termination, Tenant shall remove stored property within the timeframe designated by Provider.</p>
  <p style="font-size:10pt;">Tenant Initials: ________</p>
  <h2>10. Master Lease Termination / Loss of Premises</h2>
  <p>If Provider's underlying lease, license, or right to use the storage yard is terminated for any reason, this Agreement automatically terminates without penalty to Provider. Tenant agrees to remove stored property within a reasonable period designated by Provider. Any prepaid rent beyond the termination date shall be prorated and refunded.</p>
  <h2>11. Abandoned Property</h2>
  <p>Property remaining more than thirty (30) days after termination without written extension may be deemed abandoned and handled in accordance with Florida law at Tenant's expense.</p>
  <h2>12. Governing Law</h2>
  <p>This Agreement shall be governed by the laws of the State of Florida.</p>
  <h2>13. Entire Agreement</h2>
  <p>This document constitutes the entire agreement between the parties and may only be modified in writing signed by both parties.</p>

  <div class="sigs">
    <div><span class="sig-h">TENANT</span>
      <div class="sig-row">Signature: <span class="sig-line"></span></div>
      <div class="sig-row">Printed Name: <span class="sig-line">${esc(c.name || '')}</span></div>
      <div class="sig-row">Date: <span class="sig-line"></span></div>
    </div>
    <div><span class="sig-h">PROVIDER</span>
      <div class="sig-row">Signature: <span class="sig-line"></span></div>
      <div class="sig-row">Printed Name: <span class="sig-line">Anton Bajada Leonardes</span></div>
      <div class="sig-row">Title: <span class="sig-line">Owner / Managing Member</span></div>
      <div class="sig-row">Date: <span class="sig-line"></span></div>
    </div>
  </div>
  <p style="font-size:8.5pt;color:#889;margin-top:12px;">Version 1.3 - February 2026 &middot; Term: ${esc(TERM_LABELS[t.termType] || 'not set')}</p>
  ${docFooter()}`;

  return shell(`Storage Agreement - ${c.name || ''}`, body);
}

// ---------------- First Extension & Modification Addendum ----------------
export function renderAddendum(r) {
  const c = r.client || {};
  const p = c.property || {};
  const t = r.terms || {};
  const e = r.extension || {};

  const months = Number(e.months) || 0;
  const monthlyFee = e.monthlyFee || t.monthlyFee || 0;
  const total = Number(monthlyFee) * months;

  const body = `${docHead('FIRST EXTENSION AND MODIFICATION ADDENDUM')}
  <div class="doc-sub">TO STORAGE LOT AGREEMENT</div>
  <p class="intro">THIS FIRST EXTENSION AND MODIFICATION ADDENDUM ("Addendum") is made as of <span class="fill">${prettyDate(e.agreementDate)}</span>, by and between:</p>

  <div class="cols">
    <div>
      <div class="party-h">STORAGE PROVIDER:</div>
      TonTon Trailer Rentals LLC - Storage Division<br>
      1001 NW 12th Ave, Pompano Beach, FL 33069
      <div class="party-h" style="margin-top:12px;">STORAGE TENANT:</div>
      ${line(c.name)}
      <div class="party-h" style="margin-top:12px;">DATES:</div>
      Original Agreement Date: ${prettyDate(t.agreementDate)}<br>
      Effective Date of Extension: ${prettyDate(e.effectiveDate)}<br>
      Expiration Date of Extension: ${prettyDate(e.expirationDate)}
    </div>
    <div>
      <div class="party-h">STORED PROPERTY (Same as Original Agreement):</div>
      Type: ${propertyList(p)}<br>
      Make / Model: ${line(p.makeModel)}<br>
      Length (overall): ${line(p.length)}<br>
      License / Registration #: ${line(p.licenseReg)}<br>
      Insurance Carrier / Policy #: ${line(p.insurance)}
      <p style="font-style:italic;color:#556;">No substitution of equipment without Provider approval.</p>
    </div>
  </div>

  <div class="sec"><span class="num">1</span><span class="body"><strong class="h">EXTENSION.</strong> The parties agree to extend the original Storage Lot Agreement for an additional <strong>${months} MONTH${months === 1 ? '' : 'S'}</strong>, commencing on <strong>${prettyDate(e.effectiveDate)}</strong> and expiring on <strong>${prettyDate(e.expirationDate)}</strong>.</span></div>

  <div class="sec"><span class="num">2</span><span class="body"><strong class="h">STORAGE FEE.</strong> The monthly storage fee shall be <strong>${dollarsInWords(monthlyFee).toUpperCase()} (${money(monthlyFee)})</strong> per month.</span></div>

  <div class="sec"><span class="num">3</span><span class="body"><strong class="h">PAYMENT.</strong> The total amount of <strong>${dollarsInWords(total).toUpperCase()} (${money(total)})</strong> is due for the extension term (${prettyDate(e.effectiveDate)} through ${prettyDate(e.expirationDate)}). Payment may be made by check payable to TonTon Trailer Rentals LLC, Zelle, or another payment method accepted by the Provider.</span></div>

  <div class="sec"><span class="num">4</span><span class="body"><strong class="h">PREPAID LAST MONTH TRANSFER.</strong> Under the original Agreement, Tenant prepaid the last month of storage${t.monthlyFee ? ` in the amount of <strong>${money(t.monthlyFee)}</strong>` : ''}. That prepaid last month's rent shall not be applied at the end of the original term; instead it automatically transfers to and shall be applied against the final month of this extension term (${prettyDate(e.expirationDate)}). If the extension monthly rate exceeds the rate at which the last month was originally prepaid, Tenant shall pay the difference for that final month.</span></div>

  <div class="sec"><span class="num">5</span><span class="body"><strong class="h">CONTINUATION OF TERMS.</strong> Except as expressly modified by this Addendum, all terms, conditions, and provisions of the original Storage Lot Agreement remain in full force and effect.</span></div>

  <div class="sec"><span class="num">6</span><span class="body"><strong class="h">BINDING AGREEMENT.</strong> This Addendum is owned and agreed upon by both parties and shall be legally binding upon their respective heirs, personal representatives, successors, and assigns.</span></div>

  <div class="callout">
    <div class="ct">IMPORTANT - PAYMENT TERMS</div>
    Tenant agrees to pay <strong>${money(total)}</strong> for the extension term. Failure to pay when due constitutes a default under the original Storage Lot Agreement and may result in late fees, denial of access, lien rights where applicable, removal of the stored property, and any other remedies available under the Agreement and Florida law.
  </div>

  <p>IN WITNESS WHEREOF, the parties have executed this First Extension and Modification Addendum as of the date first written above. This Addendum, together with the original Storage Lot Agreement, constitutes the entire agreement regarding this extension and is binding upon both parties upon execution.</p>

  <div class="sigs">
    <div><span class="sig-h">TENANT</span>
      <div class="sig-row">Signature: <span class="sig-line"></span></div>
      <div class="sig-row">Printed Name: <span class="sig-line">${esc(c.name || '')}</span></div>
      <div class="sig-row">Date: <span class="sig-line"></span></div>
    </div>
    <div><span class="sig-h">PROVIDER</span>
      <div class="sig-row">Signature: <span class="sig-line"></span></div>
      <div class="sig-row">Printed Name: <span class="sig-line">Anton Bajada Leonardes</span></div>
      <div class="sig-row">Title: <span class="sig-line">Owner / Managing Member</span></div>
      <div class="sig-row">Date: <span class="sig-line"></span></div>
    </div>
  </div>
  ${docFooter()}`;

  return shell(`Extension Addendum - ${c.name || ''}`, body);
}
