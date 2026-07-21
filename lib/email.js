import { Resend } from 'resend';
import { emailShell, emailButton, esc, appUrl, NAVY, BLUE } from './branding.js';
import { prettyDate, money, TERM_LABELS, dueAtSigning, invoiceTotals, invoiceNumber, lineAmount } from './format.js';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

export function emailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

// Central send. If Resend isn't configured, it logs instead of throwing so the
// rest of the flow still works locally.
export async function sendEmail({ to, subject, html, cc }) {
  const resend = getResend();
  const from = process.env.EMAIL_FROM || 'TonTon Trailer Rentals <info@thetrailerteam.com>';
  if (!resend) {
    console.log(`[email skipped - no RESEND_API_KEY] to=${to} subject="${subject}"`);
    return { skipped: true };
  }
  const payload = { from, to, subject, html };
  if (cc) payload.cc = cc;
  const { data, error } = await resend.emails.send(payload);
  if (error) throw new Error(typeof error === 'string' ? error : JSON.stringify(error));
  return { id: data?.id };
}

function providerEmail() {
  return process.env.PROVIDER_EMAIL || 'info@thetrailerteam.com';
}

// ---- 1. Intake link to the client ----
export async function sendIntakeLink(to, token) {
  const link = `${appUrl()}/intake/${token}`;
  const html = emailShell(`
    <h2 style="color:${NAVY};margin-top:0;">You're almost set up</h2>
    <p>Thanks for choosing TonTon Trailer Rentals. Please take a minute to fill out your storage details so we can prepare your agreement.</p>
    <p style="text-align:center;margin:26px 0;">${emailButton(link, 'Fill out my storage details')}</p>
    <p style="color:#667;font-size:13px;">Or paste this link into your browser:<br>${esc(link)}</p>
  `, 'Fill out your TonTon storage details');
  return sendEmail({ to, subject: 'Your TonTon storage intake form', html });
}

// ---- 1b. Notify staff that a customer submitted the intake form ----
export async function sendNewIntakeNotice(rental) {
  const c = rental.client || {};
  const p = c.property || {};
  const to = process.env.INTAKE_NOTIFY_EMAIL || 'info@thetrailerteam.com';
  const adminLink = `${appUrl()}/admin/${rental.id}`;

  const types = [];
  if (Number(p.boat) > 0) types.push(`Boat x${p.boat}`);
  if (Number(p.trailer) > 0) types.push(`Trailer x${p.trailer}`);
  if (Number(p.rv) > 0) types.push(`RV x${p.rv}`);
  if (Number(p.vehicle) > 0) types.push(`Vehicle x${p.vehicle}`);
  if (p.other) types.push(`Other: ${p.other}`);

  const row = (label, val) =>
    `<tr><td style="padding:6px 0;color:#667;">${esc(label)}</td><td style="padding:6px 0;text-align:right;font-weight:600;">${esc(val || '-')}</td></tr>`;

  const html = emailShell(`
    <h2 style="color:${NAVY};margin-top:0;">New storage intake received</h2>
    <p><strong>${esc(c.name || 'A customer')}</strong> just submitted the intake form. Open their file to set the term and rate.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:14px 0;border-collapse:collapse;">
      ${row('Name', c.name)}
      ${row('Phone', c.phone)}
      ${row('Email', c.email)}
      ${row('Storing', types.join(', '))}
      ${row('Make / Model', p.makeModel)}
      ${row('Length', p.length)}
      ${row('License / Reg #', p.licenseReg)}
      ${row('Insurance / Policy #', p.insurance)}
    </table>
    <p style="text-align:center;margin:24px 0;">${emailButton(adminLink, 'Open their file')}</p>
  `, `New intake: ${c.name || 'customer'}`);

  return sendEmail({ to, subject: `New storage intake - ${c.name || 'customer'}`, html });
}

// ---- 2. Renewal notice to tenant (30 days out) ----
export async function sendRenewalNotice(rental) {
  const c = rental.client || {};
  const t = rental.terms || {};
  const base = `${appUrl()}/renew/${rental.renew_token}`;
  const html = emailShell(`
    <h2 style="color:${NAVY};margin-top:0;">Your storage term is coming due</h2>
    <p>Hi ${esc(c.name || 'there')}, your storage agreement with TonTon Trailer Rentals is scheduled to end on
       <strong>${prettyDate(t.endDate)}</strong>.</p>
    <p>Please let us know what you'd like to do:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;"><tr>
      <td style="padding:6px;">${emailButton(base + '?choice=extend', 'I want to extend', BLUE)}</td>
      <td style="padding:6px;">${emailButton(base + '?choice=vacate', 'I will be vacating', '#6b7688')}</td>
    </tr></table>
    <p style="color:#667;font-size:13px;">If you extend, we'll follow up with your options and pricing. If you plan to vacate, please remove your property by the end date to avoid additional charges.</p>
    <p style="color:#667;font-size:13px;">Stored property: ${esc((c.property && c.property.makeModel) || '')}</p>
  `, `Your storage term ends ${prettyDate(t.endDate)}`);
  return sendEmail({ to: c.email, subject: 'Your TonTon storage term is coming due', html });
}

// ---- 3. Notify provider of tenant's choice ----
export async function notifyProviderOfChoice(rental) {
  const c = rental.client || {};
  const t = rental.terms || {};
  const choice = rental.renewal?.choice;
  const adminLink = `${appUrl()}/admin/${rental.id}`;
  const extend = choice === 'extend';
  const html = emailShell(`
    <h2 style="color:${NAVY};margin-top:0;">${extend ? 'A tenant wants to extend' : 'A tenant is vacating'}</h2>
    <p><strong>${esc(c.name || 'A tenant')}</strong> (${esc(c.email || '')}) responded to their renewal notice.</p>
    <p style="font-size:16px;"><strong>${extend ? 'They want to EXTEND.' : 'They will be VACATING.'}</strong></p>
    <p>Current term: ${esc(TERM_LABELS[t.termType] || '')} at ${money(t.monthlyFee)}/mo, ending ${prettyDate(t.endDate)}.</p>
    ${extend
      ? `<p>Open their file to set the extension length and pricing, then send the addendum:</p>
         <p style="text-align:center;margin:22px 0;">${emailButton(adminLink, 'Set extension options')}</p>`
      : `<p>Their property should be removed by ${prettyDate(t.endDate)}.</p>
         <p style="text-align:center;margin:22px 0;">${emailButton(adminLink, 'Open tenant file')}</p>`}
  `, extend ? 'Tenant wants to extend' : 'Tenant is vacating');
  return sendEmail({ to: providerEmail(), subject: extend ? `Extend request - ${c.name || 'tenant'}` : `Vacate notice - ${c.name || 'tenant'}`, html });
}

// ---- 2b. Ask the customer to sign electronically ----
export async function sendSignatureRequest(rental) {
  const c = rental.client || {};
  const t = rental.terms || {};
  const due = dueAtSigning(t);
  const link = `${appUrl()}/sign/${rental.token}`;

  const row = (label, val, bold) =>
    `<tr><td style="padding:7px 0;color:#667;">${esc(label)}</td><td style="padding:7px 0;text-align:right;${bold ? `font-weight:800;color:${NAVY};` : 'font-weight:600;'}">${esc(val)}</td></tr>`;

  const html = emailShell(`
    <h2 style="color:${NAVY};margin-top:0;">Your storage agreement is ready to sign</h2>
    <p>Hi ${esc(c.name || 'there')}, your agreement is ready. You can read and sign it right on your
       phone in about a minute. <strong>No printing or scanning needed.</strong></p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;border-collapse:collapse;">
      ${row('Term', TERM_LABELS[t.termType] || '-')}
      ${t.termStart && t.endDate ? row('Term dates', `${prettyDate(t.termStart)} to ${prettyDate(t.endDate)}`) : ''}
      ${row('Monthly rate', `${money(t.monthlyFee)} / month`)}
      ${row('Due at signing', money(due.total), true)}
    </table>
    <p style="text-align:center;margin:26px 0;">${emailButton(link, 'Review & sign agreement')}</p>
    <p style="color:#667;font-size:13px;">Or paste this into your browser:<br>${esc(link)}</p>
    <p style="color:#667;font-size:13px;">Questions? Reply to this email or call 954-298-7794.</p>
  `, 'Your TonTon storage agreement is ready to sign');

  return sendEmail({ to: c.email, subject: 'Sign your TonTon storage agreement', html });
}

// ---- 2c. Signed copy to the customer (and staff) ----
export async function sendSignedCopy(rental) {
  const c = rental.client || {};
  const t = rental.terms || {};
  const sig = t.signature || {};
  const due = dueAtSigning(t);
  const link = `${appUrl()}/agreement/${rental.token}`;

  const html = emailShell(`
    <h2 style="color:${NAVY};margin-top:0;">Agreement signed - thank you</h2>
    <p>Hi ${esc(c.name || 'there')}, we've received your signed storage agreement. Here's your copy for your records.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;border-collapse:collapse;background:#f2f5fa;border-radius:8px;">
      <tr><td style="padding:14px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#667;">Signed by</td><td style="padding:6px 0;text-align:right;font-weight:600;">${esc(sig.name || c.name || '')}</td></tr>
          <tr><td style="padding:6px 0;color:#667;">Signed on</td><td style="padding:6px 0;text-align:right;font-weight:600;">${prettyDate(t.signedAt)}</td></tr>
          <tr><td style="padding:6px 0;color:#667;">Due at signing</td><td style="padding:6px 0;text-align:right;font-weight:800;color:${NAVY};">${money(due.total)}</td></tr>
        </table>
      </td></tr>
    </table>
    <p style="text-align:center;margin:24px 0;">${emailButton(link, 'View / print your agreement')}</p>
    <p style="color:#667;font-size:13px;">We'll follow up about payment. Questions? Call 954-298-7794.</p>
  `, 'Your signed TonTon storage agreement');

  return sendEmail({
    to: c.email,
    cc: [providerEmail()],
    subject: `Signed agreement - ${c.name || 'TonTon Storage'}`,
    html,
  });
}

// ---- 2d. Fully executed copy (both parties signed) ----
export async function sendExecutedCopy(rental) {
  const c = rental.client || {};
  const t = rental.terms || {};
  const due = dueAtSigning(t);
  const link = `${appUrl()}/agreement/${rental.token}`;

  const html = emailShell(`
    <h2 style="color:${NAVY};margin-top:0;">Your agreement is fully executed</h2>
    <p>Hi ${esc(c.name || 'there')}, TonTon Trailer Rentals has countersigned your storage agreement.
       It is now fully executed by both parties. Your copy is below for your records.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;border-collapse:collapse;background:#f2f5fa;border-radius:8px;">
      <tr><td style="padding:14px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#667;">Signed by you</td><td style="padding:6px 0;text-align:right;font-weight:600;">${prettyDate(t.signedAt)}</td></tr>
          <tr><td style="padding:6px 0;color:#667;">Countersigned</td><td style="padding:6px 0;text-align:right;font-weight:600;">${prettyDate(t.executedAt)}</td></tr>
          <tr><td style="padding:6px 0;color:#667;">Monthly rate</td><td style="padding:6px 0;text-align:right;font-weight:600;">${money(t.monthlyFee)} / month</td></tr>
          <tr><td style="padding:6px 0;color:#667;">Due at signing</td><td style="padding:6px 0;text-align:right;font-weight:800;color:${NAVY};">${money(due.total)}</td></tr>
        </table>
      </td></tr>
    </table>
    <p style="text-align:center;margin:24px 0;">${emailButton(link, 'View / print executed agreement')}</p>
    <p style="color:#667;font-size:13px;">Questions? Call 954-298-7794.</p>
  `, 'Your fully executed TonTon storage agreement');

  return sendEmail({
    to: c.email,
    cc: [providerEmail()],
    subject: `Executed agreement - ${c.name || 'TonTon Storage'}`,
    html,
  });
}

// ---- 3a. Monthly payment reminder (1st of the month) ----
export async function sendPaymentReminder(rental, monthName) {
  const c = rental.client || {};
  const t = rental.terms || {};

  const html = emailShell(`
    <h2 style="color:${NAVY};margin-top:0;">Your storage payment for ${esc(monthName)}</h2>
    <p>Hi ${esc(c.name || 'there')}, this is a friendly reminder that your storage payment is due.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;border-collapse:collapse;background:#f2f5fa;border-radius:8px;">
      <tr><td style="padding:16px;text-align:center;">
        <div style="color:#667;font-size:13px;">Amount due</div>
        <div style="font-size:30px;font-weight:800;color:${NAVY};margin-top:2px;">${money(t.monthlyFee)}</div>
        <div style="color:#667;font-size:13px;margin-top:4px;">for ${esc(monthName)}</div>
      </td></tr>
    </table>
    ${t.paymentMethod ? `<p style="color:#667;font-size:13px;">Payment method on file: ${esc(t.paymentMethod)}.</p>` : ''}
    <p style="color:#667;font-size:13px;">Payments not received within five (5) days of the due date incur a $25 late fee.
       If you've already paid, thank you and please disregard this message.</p>
    <p style="color:#667;font-size:13px;">Questions? Reply to this email or call 954-298-7794.</p>
  `, `Storage payment due - ${money(t.monthlyFee)}`);

  return sendEmail({ to: c.email, subject: `Storage payment due for ${monthName}`, html });
}

// ---- Standalone invoice to the customer (copy to staff) ----
export async function sendInvoiceEmail(inv) {
  const items = Array.isArray(inv.items) ? inv.items : [];
  const t = invoiceTotals(items, inv.tax_rate);
  const link = `${appUrl()}/invoice/${inv.token}`;

  const rows = items.map((it) => `
    <tr>
      <td style="padding:7px 0;color:#334;">${esc(it.description || '')}${Number(it.qty) !== 1 ? ` <span style="color:#889;">x${esc(String(it.qty))}</span>` : ''}</td>
      <td style="padding:7px 0;text-align:right;font-weight:600;">${money(lineAmount(it))}</td>
    </tr>`).join('');

  const html = emailShell(`
    <h2 style="color:${NAVY};margin-top:0;">Invoice ${invoiceNumber(inv)}</h2>
    <p>Hi ${esc(inv.customer_name || 'there')}, here's your invoice from TonTon Trailer Rentals.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;border-collapse:collapse;">
      ${rows}
      <tr><td colspan="2" style="border-top:1px solid #d8dfe8;padding-top:8px;"></td></tr>
      <tr><td style="padding:5px 0;color:#667;">Subtotal</td><td style="padding:5px 0;text-align:right;">${money(t.subtotal)}</td></tr>
      <tr><td style="padding:5px 0;color:#667;">Sales tax (${Number(inv.tax_rate ?? 7)}%)</td><td style="padding:5px 0;text-align:right;">${money(t.tax)}</td></tr>
      <tr>
        <td style="padding:9px 0;font-weight:800;color:${NAVY};border-top:2px solid ${NAVY};">Total due</td>
        <td style="padding:9px 0;text-align:right;font-weight:800;color:${NAVY};font-size:18px;border-top:2px solid ${NAVY};">${money(t.total)}</td>
      </tr>
    </table>
    <p style="text-align:center;margin:24px 0;">${emailButton(link, 'View / print invoice')}</p>
    <p style="color:#667;font-size:13px;">Payable by cash, Zelle, check, or card (card adds a 3% processing fee).
       Please reference ${invoiceNumber(inv)}. Questions? Call 954-298-7794.</p>
  `, `Invoice ${invoiceNumber(inv)} - ${money(t.total)}`);

  return sendEmail({
    to: inv.customer_email,
    cc: [providerEmail()],
    subject: `Invoice ${invoiceNumber(inv)} from TonTon Trailer Rentals`,
    html,
  });
}

// ---- 3b. Payment confirmation / receipt to the customer (copy to staff) ----
export async function sendPaymentConfirmation(rental) {
  const c = rental.client || {};
  const p = c.property || {};
  const t = rental.terms || {};
  const pay = t.payment || {};
  const due = dueAtSigning(t);

  const row = (label, val, bold) =>
    `<tr><td style="padding:7px 0;color:#667;">${esc(label)}</td><td style="padding:7px 0;text-align:right;${bold ? `font-weight:800;color:${NAVY};` : 'font-weight:600;'}">${esc(val)}</td></tr>`;

  const termLine = t.termStart && t.endDate
    ? `${prettyDate(t.termStart)} to ${prettyDate(t.endDate)}`
    : t.endDate ? `through ${prettyDate(t.endDate)}` : 'Month-to-month';

  const html = emailShell(`
    <h2 style="color:${NAVY};margin-top:0;">Payment received - thank you</h2>
    <p>Hi ${esc(c.name || 'there')}, we've received your payment. Here's your confirmation and a summary of your storage agreement.</p>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;border-collapse:collapse;background:#f2f5fa;border-radius:8px;">
      <tr><td style="padding:14px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
          ${row('Amount paid', money(pay.amount), true)}
          ${row('Date paid', prettyDate(pay.paidAt))}
          ${pay.method ? row('Method', pay.method) : ''}
          ${pay.note ? row('Note', pay.note) : ''}
        </table>
      </td></tr>
    </table>

    <h3 style="color:${NAVY};font-size:15px;margin:22px 0 6px;">Your agreement</h3>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
      ${row('Tenant', c.name || '-')}
      ${row('Stored property', [p.makeModel, p.length].filter(Boolean).join(', ') || '-')}
      ${p.licenseReg ? row('License / Reg #', p.licenseReg) : ''}
      ${row('Term', TERM_LABELS[t.termType] || '-')}
      ${row('Term dates', termLine)}
      ${row('Monthly rate', `${money(t.monthlyFee)} / month`)}
    </table>

    <h3 style="color:${NAVY};font-size:15px;margin:22px 0 6px;">What was due at signing</h3>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
      ${t.proration ? row(`Prorated ${prettyDate(t.proration.from)} - ${prettyDate(t.proration.to)} (${t.proration.days} days)`, money(due.prorated)) : ''}
      ${row('First month', money(due.firstMonth))}
      ${row('Last month (held as prepaid rent)', money(due.lastMonth))}
      ${due.oneTime ? row(due.oneTimeLabel, money(due.oneTime)) : ''}
      <tr><td colspan="2" style="border-top:1px solid #d8dfe8;"></td></tr>
      ${row('Total due at signing', money(due.total), true)}
    </table>

    <p style="color:#667;font-size:13px;margin-top:20px;">Your last month's payment is held as prepaid rent and applied to the final month of your term. Questions? Reply to this email or call 954-298-7794.</p>
  `, `Payment received - ${money(pay.amount)}`);

  return sendEmail({
    to: c.email,
    cc: [providerEmail()],
    subject: `Payment received - TonTon Storage`,
    html,
  });
}

// ---- 4. Extension offer + addendum to tenant ----
export async function sendExtensionOffer(rental) {
  const c = rental.client || {};
  const e = rental.extension || {};
  const addendumLink = `${appUrl()}/addendum/${rental.id}`;
  const total = (Number(e.monthlyFee) || 0) * (Number(e.months) || 0);
  const html = emailShell(`
    <h2 style="color:${NAVY};margin-top:0;">Your extension options</h2>
    <p>Hi ${esc(c.name || 'there')}, thanks for choosing to stay with TonTon Trailer Rentals. Here are the terms for your extension:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;border-collapse:collapse;">
      <tr><td style="padding:8px 0;color:#667;">Extension length</td><td style="padding:8px 0;text-align:right;font-weight:700;">${esc(e.months)} months</td></tr>
      <tr><td style="padding:8px 0;color:#667;">Effective</td><td style="padding:8px 0;text-align:right;font-weight:700;">${prettyDate(e.effectiveDate)}</td></tr>
      <tr><td style="padding:8px 0;color:#667;">Expires</td><td style="padding:8px 0;text-align:right;font-weight:700;">${prettyDate(e.expirationDate)}</td></tr>
      <tr><td style="padding:8px 0;color:#667;">Monthly rate</td><td style="padding:8px 0;text-align:right;font-weight:700;">${money(e.monthlyFee)}/mo</td></tr>
      <tr><td style="padding:8px 0;color:#667;border-top:1px solid #e3e7ee;">Total for term</td><td style="padding:8px 0;text-align:right;font-weight:800;color:${NAVY};border-top:1px solid #e3e7ee;">${money(total)}</td></tr>
    </table>
    <p style="color:#667;font-size:13px;margin:14px 0 0;">Your prepaid last month from the original agreement transfers to the final month of this extension, so you stay one month ahead.</p>
    <p style="text-align:center;margin:24px 0;">${emailButton(addendumLink, 'View & print your addendum')}</p>
    <p style="color:#667;font-size:13px;">Reply to this email or call 954-298-7794 with any questions.</p>
  `, 'Your TonTon storage extension options');
  return sendEmail({ to: c.email, subject: 'Your TonTon storage extension options', html });
}
