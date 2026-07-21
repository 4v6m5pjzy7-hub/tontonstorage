// Shared brand pieces for printable documents and emails.
// Matches the TonTon "Storage Division" letterhead: navy + blue, logo header,
// numbered blue sections, dark payment-terms callout, dual signature blocks.

export const NAVY = '#12356b';
export const BLUE = '#1f66d0';
export const INK = '#1a2230';

export function esc(v) {
  if (v === undefined || v === null) return '';
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function appUrl() {
  return (process.env.APP_URL || 'http://localhost:3500').replace(/\/+$/, '');
}

// Letterhead for the printable legal documents. Uses the white-background
// logo (logo-print.png) so it looks clean on white paper; falls back to the
// standard logo if the print version hasn't been uploaded.
export function docHead(title) {
  const base = appUrl();
  return `<div class="lh">
    <img src="${base}/logo-print.png" alt="TonTon Trailer Rentals" class="lh-logo"
         onerror="this.onerror=null;this.src='${base}/logo.png'">
    <div class="lh-name">TonTon Trailer Rentals LLC</div>
    <div class="lh-div">STORAGE DIVISION</div>
    <div class="lh-contact">
      <span>&#128205; 1001 NW 12th Ave, Pompano Beach, FL 33069</span>
      <span>&#128222; 954-298-7794</span>
      <span>&#9993; info@thetrailerteam.com</span>
    </div>
  </div>
  <div class="doc-title">${title}</div>`;
}

export function docFooter() {
  return `<div class="doc-footer">
    <div class="tags">&#128676; BOATS &nbsp;&middot;&nbsp; RVs &nbsp;&middot;&nbsp; COMMERCIAL VEHICLES &nbsp;&middot;&nbsp; SECURE STORAGE SOLUTIONS</div>
    <div class="thanks">Thank you for trusting us with your valuable property.</div>
  </div>`;
}

export const DOC_STYLES = `
  @page { margin: 0.6in; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, Helvetica, sans-serif; color: ${INK}; font-size: 11.5pt; line-height: 1.5; margin: 0; padding: 28px; max-width: 8.1in; margin: 0 auto; }
  .lh { text-align: center; border-bottom: 3px solid ${NAVY}; padding-bottom: 12px; }
  .lh-logo { max-height: 150px; margin: 0 auto 6px; display: block; }
  .lh-name { font-size: 22pt; font-weight: 800; color: ${NAVY}; letter-spacing: .5px; }
  .lh-div { font-size: 11pt; font-weight: 700; color: ${BLUE}; letter-spacing: 4px; margin-top: 2px; }
  .lh-contact { margin-top: 8px; font-size: 9.5pt; color: #445; display: flex; justify-content: center; gap: 18px; flex-wrap: wrap; }
  .doc-title { text-align: center; font-size: 17pt; font-weight: 800; color: ${NAVY}; margin: 18px 0 4px; }
  .doc-sub { text-align: center; color: ${BLUE}; letter-spacing: 3px; font-weight: 700; font-size: 10pt; margin-bottom: 16px; }
  h2 { color: ${NAVY}; font-size: 12pt; margin: 18px 0 6px; }
  .intro { margin: 10px 0; }
  .cols { display: flex; gap: 24px; margin: 12px 0; }
  .cols > div { flex: 1; }
  .party-h { color: ${NAVY}; font-weight: 800; font-size: 10.5pt; }
  .num { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: ${BLUE}; color: #fff; font-weight: 700; font-size: 10pt; margin-right: 8px; }
  .sec { margin: 12px 0; }
  .sec .body { display: inline; }
  .sec strong.h { color: ${NAVY}; }
  .fill { border-bottom: 1px solid ${INK}; padding: 0 6px; }
  .callout { background: ${NAVY}; color: #fff; border-radius: 10px; padding: 16px 20px; margin: 20px 0; }
  .callout .ct { text-align: center; font-weight: 800; letter-spacing: 2px; border-bottom: 1px solid rgba(255,255,255,.35); padding-bottom: 6px; margin-bottom: 8px; }
  .sigs { display: flex; gap: 40px; margin-top: 26px; }
  .sigs > div { flex: 1; }
  .sig-h { background: ${BLUE}; color: #fff; font-weight: 700; font-size: 9pt; letter-spacing: 1px; padding: 3px 12px; border-radius: 5px; display: inline-block; }
  .sig-row { margin-top: 12px; font-size: 10pt; }
  .sig-line { display: inline-block; min-width: 200px; border-bottom: 1px solid ${INK}; }
  .doc-footer { border-top: 2px solid ${NAVY}; margin-top: 26px; padding-top: 10px; text-align: center; }
  .doc-footer .tags { color: ${NAVY}; font-weight: 700; font-size: 9.5pt; }
  .doc-footer .thanks { color: ${BLUE}; font-style: italic; margin-top: 4px; font-size: 10pt; }
  .box { display: inline-block; font-weight: 700; }
  .noprint { text-align: center; margin-bottom: 14px; }
  @media print { .noprint { display: none; } body { padding: 0; } }
`;

// ---- Email shell (inline styles for mail-client compatibility) ----
export function emailShell(innerHtml, preheader = '') {
  const logo = `${appUrl()}/logo.png`;
  return `<!doctype html><html><body style="margin:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:${INK};">
  <span style="display:none;opacity:0;color:transparent;">${esc(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden;max-width:600px;width:100%;box-shadow:0 2px 10px rgba(20,40,80,.08);">
        <tr><td style="background:${NAVY};padding:22px;text-align:center;">
          <img src="${logo}" alt="TonTon Trailer Rentals" width="120" style="max-height:90px;display:block;margin:0 auto 6px;">
          <div style="color:#fff;font-weight:800;font-size:18px;letter-spacing:.5px;">TonTon Trailer Rentals LLC</div>
          <div style="color:#8fb6ee;font-weight:700;letter-spacing:3px;font-size:11px;">STORAGE DIVISION</div>
        </td></tr>
        <tr><td style="padding:28px;">${innerHtml}</td></tr>
        <tr><td style="background:#f2f5fa;padding:16px 28px;text-align:center;color:#667;font-size:12px;">
          TonTon Trailer Rentals LLC &middot; 1001 NW 12th Ave, Pompano Beach, FL 33069 &middot; 954-298-7794
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

export function emailButton(href, label, color = BLUE) {
  return `<a href="${href}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;font-weight:700;padding:12px 26px;border-radius:8px;font-size:15px;">${esc(label)}</a>`;
}
