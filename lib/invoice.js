import { esc, docHead, docFooter, DOC_STYLES, NAVY } from './branding.js';
import { money, prettyDate, invoiceTotals, lineAmount, invoiceNumber, DEFAULT_TAX_RATE } from './format.js';

export { invoiceTotals, lineAmount, invoiceNumber, DEFAULT_TAX_RATE };

export function renderInvoice(inv) {
  const items = Array.isArray(inv.items) ? inv.items : [];
  const t = invoiceTotals(items, inv.tax_rate);
  const paid = inv.status === 'paid';

  const rows = items.map((it) => `
    <tr>
      <td style="padding:9px 6px;border-bottom:1px solid #e6eaf0;">${esc(it.description || '')}</td>
      <td style="padding:9px 6px;border-bottom:1px solid #e6eaf0;text-align:center;white-space:nowrap;">${esc(String(it.qty ?? 1))}</td>
      <td style="padding:9px 6px;border-bottom:1px solid #e6eaf0;text-align:right;white-space:nowrap;">${money(it.rate)}</td>
      <td style="padding:9px 6px;border-bottom:1px solid #e6eaf0;text-align:right;white-space:nowrap;font-weight:600;">${money(lineAmount(it))}</td>
    </tr>`).join('');

  const body = `${docHead('INVOICE')}

  <div class="cols" style="margin-top:4px;">
    <div>
      <div class="party-h">BILL TO:</div>
      ${esc(inv.customer_name || '')}
      ${inv.customer_email ? `<br>${esc(inv.customer_email)}` : ''}
      ${inv.customer_phone ? `<br>${esc(inv.customer_phone)}` : ''}
    </div>
    <div style="text-align:right;">
      <div class="party-h">INVOICE</div>
      <div style="font-size:15pt;font-weight:800;color:${NAVY};">${invoiceNumber(inv)}</div>
      <div style="margin-top:4px;">Date: ${prettyDate(inv.issued_on)}</div>
      ${paid ? `<div style="margin-top:6px;display:inline-block;background:#e0f4e8;color:#16724a;font-weight:800;padding:4px 14px;border-radius:999px;letter-spacing:1px;">PAID${inv.paid_on ? ` ${prettyDate(inv.paid_on)}` : ''}</div>` : ''}
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-top:18px;">
    <thead>
      <tr style="background:${NAVY};color:#fff;">
        <th style="padding:9px 6px;text-align:left;font-size:9.5pt;letter-spacing:.5px;">DESCRIPTION</th>
        <th style="padding:9px 6px;text-align:center;font-size:9.5pt;letter-spacing:.5px;width:60px;">QTY</th>
        <th style="padding:9px 6px;text-align:right;font-size:9.5pt;letter-spacing:.5px;width:100px;">RATE</th>
        <th style="padding:9px 6px;text-align:right;font-size:9.5pt;letter-spacing:.5px;width:110px;">AMOUNT</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="4" style="padding:14px 6px;color:#889;">No line items.</td></tr>'}</tbody>
  </table>

  <table style="width:280px;margin-left:auto;margin-top:14px;border-collapse:collapse;">
    <tr><td style="padding:5px 6px;">Subtotal</td><td style="padding:5px 6px;text-align:right;">${money(t.subtotal)}</td></tr>
    <tr><td style="padding:5px 6px;">Sales tax (${Number(inv.tax_rate ?? DEFAULT_TAX_RATE)}%)</td><td style="padding:5px 6px;text-align:right;">${money(t.tax)}</td></tr>
    <tr>
      <td style="padding:9px 6px;border-top:2px solid ${NAVY};font-weight:800;color:${NAVY};">TOTAL DUE</td>
      <td style="padding:9px 6px;border-top:2px solid ${NAVY};text-align:right;font-weight:800;color:${NAVY};font-size:13pt;">${money(t.total)}</td>
    </tr>
  </table>

  ${inv.notes ? `<div style="margin-top:18px;"><strong>Notes:</strong><br>${esc(inv.notes).replace(/\n/g, '<br>')}</div>` : ''}

  <div style="margin-top:20px;border:1px solid #ccd5e0;border-radius:8px;padding:12px 16px;font-size:10pt;color:#445;">
    <strong style="color:${NAVY};">Payment.</strong> Payable to TonTon Trailer Rentals LLC by cash, Zelle, check,
    or card (card payments incur a 3% processing fee). Please reference ${invoiceNumber(inv)} with your payment.
  </div>

  ${docFooter()}`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>${invoiceNumber(inv)} - ${esc(inv.customer_name || '')}</title>
  <style>${DOC_STYLES}</style></head><body>
  <div class="noprint">
    <button onclick="window.print()" style="padding:10px 22px;font-size:14px;cursor:pointer;background:#12356b;color:#fff;border:none;border-radius:8px;">Print / Save as PDF</button>
  </div>
  ${body}
  </body></html>`;
}
