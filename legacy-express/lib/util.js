// Shared helpers.

function esc(v) {
  if (v === undefined || v === null) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Renders a shared page shell for the admin/intake UI (not the printable contract).
function layout(title, body) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} - TonTon Storage</title>
<style>
  :root {
    --ink: #1a2230; --muted: #6b7688; --line: #e3e7ee; --bg: #f5f7fa;
    --brand: #0d5c63; --brand-dark: #0a474d; --accent: #f4a259; --card: #fff;
    --ok: #1f8a55; --warn: #b8860b;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--ink); }
  header { background: var(--brand); color: #fff; padding: 16px 24px; display: flex; align-items: center; gap: 12px; }
  header .logo { font-weight: 800; font-size: 18px; letter-spacing: .5px; }
  header .tag { color: #bfe3e6; font-size: 13px; }
  .wrap { max-width: 860px; margin: 0 auto; padding: 24px; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 24px; margin-bottom: 18px; box-shadow: 0 1px 3px rgba(20,30,50,.04); }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 0 0 14px; }
  .lead { color: var(--muted); margin: 0 0 18px; }
  label { display: block; font-size: 13px; font-weight: 600; margin: 14px 0 5px; }
  input[type=text], input[type=email], input[type=tel], input[type=number], input[type=date], select, textarea {
    width: 100%; padding: 11px 12px; border: 1px solid var(--line); border-radius: 9px; font-size: 15px; font-family: inherit; background: #fff;
  }
  input:focus, select:focus, textarea:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 3px rgba(13,92,99,.12); }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .row3 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; }
  .btn { display: inline-block; background: var(--brand); color: #fff; border: none; padding: 12px 22px; border-radius: 9px; font-size: 15px; font-weight: 600; cursor: pointer; text-decoration: none; }
  .btn:hover { background: var(--brand-dark); }
  .btn.alt { background: #fff; color: var(--brand); border: 1px solid var(--brand); }
  .btn.accent { background: var(--accent); color: #3a2a10; }
  .muted { color: var(--muted); font-size: 13px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 11px 10px; border-bottom: 1px solid var(--line); font-size: 14px; }
  th { color: var(--muted); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: .4px; }
  .pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .pill.pending { background: #fdf3e3; color: var(--warn); }
  .pill.submitted { background: #e4f0ff; color: #2166c9; }
  .pill.active { background: #e5f5ec; color: var(--ok); }
  .linkbox { display: flex; gap: 8px; margin-top: 10px; }
  .linkbox input { font-family: monospace; font-size: 13px; }
  .fieldset { border: 1px solid var(--line); border-radius: 10px; padding: 8px 16px 16px; margin-top: 8px; }
  .fieldset legend { font-size: 13px; font-weight: 700; padding: 0 6px; color: var(--brand); }
  .empty { text-align: center; color: var(--muted); padding: 30px 0; }
  a { color: var(--brand); }
  .kv { display: grid; grid-template-columns: 190px 1fr; gap: 6px 14px; font-size: 14px; }
  .kv dt { color: var(--muted); }
  .kv dd { margin: 0; }
  @media (max-width: 640px) { .row, .row3 { grid-template-columns: 1fr; } }
</style></head>
<body>
<header>
  <span class="logo">TonTon Storage</span>
  <span class="tag">Trailer Rentals LLC &middot; Pompano Beach, FL</span>
</header>
<div class="wrap">
${body}
</div>
</body></html>`;
}

module.exports = { esc, layout };
