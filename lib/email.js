import { Resend } from 'resend';
import { emailShell, emailButton, esc, appUrl, NAVY, BLUE } from './branding.js';
import { prettyDate, money, TERM_LABELS } from './format.js';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

export function emailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

// Central send. If Resend isn't configured, it logs instead of throwing so the
// rest of the flow still works locally.
export async function sendEmail({ to, subject, html }) {
  const resend = getResend();
  const from = process.env.EMAIL_FROM || 'TonTon Trailer Rentals <storage@thetrailerteam.com>';
  if (!resend) {
    console.log(`[email skipped - no RESEND_API_KEY] to=${to} subject="${subject}"`);
    return { skipped: true };
  }
  const { data, error } = await resend.emails.send({ from, to, subject, html });
  if (error) throw new Error(typeof error === 'string' ? error : JSON.stringify(error));
  return { id: data?.id };
}

function providerEmail() {
  return process.env.PROVIDER_EMAIL || 'storage@thetrailerteam.com';
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
