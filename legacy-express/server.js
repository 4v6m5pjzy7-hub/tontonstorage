const express = require('express');
const crypto = require('crypto');
const db = require('./lib/db');
const { esc, layout } = require('./lib/util');
const { renderContract, TERM_LABELS } = require('./lib/contract');
const mailer = require('./lib/mailer');

const app = express();
const PORT = process.env.PORT || 3500;
app.use(express.urlencoded({ extended: true }));

function baseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

function statusPill(status) {
  const label = { pending: 'Awaiting client', submitted: 'Ready to price', active: 'Active' }[status] || status;
  return `<span class="pill ${esc(status)}">${esc(label)}</span>`;
}

// ---------- ADMIN: dashboard ----------
app.get('/', (req, res) => {
  const rentals = db.all();
  const rows = rentals.map((r) => {
    const name = (r.client && r.client.name) || '(awaiting client info)';
    const fee = r.terms && r.terms.monthlyFee ? `$${Number(r.terms.monthlyFee).toLocaleString('en-US')}/mo` : '—';
    return `<tr>
      <td><a href="/admin/${esc(r.id)}"><strong>${esc(name)}</strong></a><br><span class="muted">${new Date(r.createdAt).toLocaleDateString('en-US')}</span></td>
      <td>${statusPill(r.status)}</td>
      <td>${esc((r.terms && TERM_LABELS[r.terms.termType]) || '—')}</td>
      <td>${fee}</td>
      <td><a href="/admin/${esc(r.id)}">Open &rarr;</a></td>
    </tr>`;
  }).join('');

  const table = rentals.length
    ? `<table><thead><tr><th>Client</th><th>Status</th><th>Term</th><th>Rate</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
    : `<div class="empty">No rentals yet. Create an intake link to send to your first client.</div>`;

  res.send(layout('Dashboard', `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <div><h1>Rentals</h1><p class="lead" style="margin:0;">Send a link, collect client info, set the term &amp; rate, generate the contract.</p></div>
      <form method="POST" action="/admin/new"><button class="btn accent">+ New intake link</button></form>
    </div>
    <div class="card">${table}</div>
  `));
});

// ---------- ADMIN: create a new intake link ----------
app.post('/admin/new', (req, res) => {
  const rental = {
    id: crypto.randomUUID(),
    token: crypto.randomBytes(9).toString('hex'),
    status: 'pending',
    createdAt: Date.now(),
    client: null,
    terms: null,
  };
  db.insert(rental);
  res.redirect(`/admin/${rental.id}`);
});

// ---------- ADMIN: save client contact / send intake link ----------
app.post('/admin/:id/send', async (req, res) => {
  const r = db.findById(req.params.id);
  if (!r) return res.status(404).send('Not found');
  const { email, phone, mode } = req.body;
  db.update(r.id, { contact: { email: email || '', phone: phone || '' } });

  if (mode === 'server' && mailer.isConfigured() && email) {
    const link = `${baseUrl(req)}/intake/${r.token}`;
    try {
      await mailer.sendIntakeLink(email, link);
      return res.redirect(`/admin/${r.id}?sent=1`);
    } catch (e) {
      return res.redirect(`/admin/${r.id}?sent=err`);
    }
  }
  res.redirect(`/admin/${r.id}`);
});

// ---------- ADMIN: single rental file ----------
app.get('/admin/:id', (req, res) => {
  const r = db.findById(req.params.id);
  if (!r) return res.status(404).send(layout('Not found', '<div class="card"><h1>Not found</h1><a href="/">Back to dashboard</a></div>'));

  const link = `${baseUrl(req)}/intake/${r.token}`;
  const contact = r.contact || {};

  // Prefilled mailto:/sms: that open the provider's own mail/messaging app (no setup needed).
  const msg = mailer.intakeMessage(link);
  const mailtoHref = `mailto:${encodeURIComponent(contact.email || '')}?subject=${encodeURIComponent('Your TonTon storage intake form')}&body=${encodeURIComponent(msg)}`;
  const smsHref = `sms:${encodeURIComponent(contact.phone || '')}?&body=${encodeURIComponent(msg)}`;

  const sentBanner = req.query.sent === '1'
    ? '<p class="muted" style="color:var(--ok);font-weight:600;">Email sent to the client.</p>'
    : req.query.sent === 'err'
    ? '<p class="muted" style="color:#b3261e;font-weight:600;">Could not send email (SMTP not configured). Use the one-click buttons below instead.</p>'
    : '';

  const linkCard = `<div class="card">
    <h2>1 &middot; Send the client intake link ${statusPill(r.status)}</h2>
    ${sentBanner}
    <p class="muted">Grab the client's email and/or phone while you're on the call, then send the link. It comes back here once they fill it out.</p>
    <form method="POST" action="/admin/${esc(r.id)}/send">
      <div class="row">
        <div><label>Client email</label><input type="email" name="email" value="${esc(contact.email || '')}" placeholder="client@example.com"></div>
        <div><label>Client phone</label><input type="tel" name="phone" value="${esc(contact.phone || '')}" placeholder="954-555-0100"></div>
      </div>
      <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">
        <a class="btn" href="${esc(mailtoHref)}">Email link</a>
        <a class="btn" href="${esc(smsHref)}">Text link</a>
        ${mailer.isConfigured() ? '<button class="btn accent" name="mode" value="server">Auto-send email</button>' : ''}
        <button class="btn alt" name="mode" value="save">Save contact</button>
      </div>
    </form>
    <p class="muted" style="margin-top:16px;">Or copy the raw link:</p>
    <div class="linkbox">
      <input id="lnk" type="text" readonly value="${esc(link)}">
      <button class="btn alt" onclick="navigator.clipboard.writeText(document.getElementById('lnk').value);this.textContent='Copied!'">Copy</button>
      <a class="btn alt" href="${esc(link)}" target="_blank">Open</a>
    </div>
  </div>`;

  let infoCard;
  if (!r.client) {
    infoCard = `<div class="card"><h2>2 &middot; Client details</h2><div class="empty">Waiting on the client to submit the form.</div></div>`;
  } else {
    const c = r.client, p = c.property || {};
    const types = [];
    if (Number(p.boat) > 0) types.push(`Boat &times;${esc(p.boat)}`);
    if (Number(p.trailer) > 0) types.push(`Trailer &times;${esc(p.trailer)}`);
    if (Number(p.rv) > 0) types.push(`RV &times;${esc(p.rv)}`);
    if (Number(p.vehicle) > 0) types.push(`Vehicle &times;${esc(p.vehicle)}`);
    if (p.other) types.push(`Other: ${esc(p.other)}`);
    infoCard = `<div class="card"><h2>2 &middot; Client details</h2>
      <dl class="kv">
        <dt>Name</dt><dd>${esc(c.name)}</dd>
        <dt>Phone</dt><dd>${esc(c.phone)}</dd>
        <dt>Email</dt><dd>${esc(c.email)}</dd>
        <dt>Stored property</dt><dd>${types.join(', ') || '—'}</dd>
        <dt>Make / Model</dt><dd>${esc(p.makeModel) || '—'}</dd>
        <dt>Length (overall)</dt><dd>${esc(p.length) || '—'}</dd>
        <dt>License / Reg #</dt><dd>${esc(p.licenseReg) || '—'}</dd>
        <dt>Insurance / Policy #</dt><dd>${esc(p.insurance) || '—'}</dd>
      </dl>
      <p class="muted" style="margin-top:14px;">Submitted ${new Date(r.submittedAt).toLocaleString('en-US')}</p>
    </div>`;
  }

  const t = r.terms || {};
  const sel = (field, val) => (t[field] === val ? 'selected' : '');
  const priceCard = r.client ? `<div class="card">
    <h2>3 &middot; Set term &amp; rate</h2>
    <form method="POST" action="/admin/${esc(r.id)}/terms">
      <div class="row">
        <div><label>Term type</label>
          <select name="termType" required>
            <option value="">Select…</option>
            <option value="month-to-month" ${sel('termType','month-to-month')}>Month-to-month</option>
            <option value="fixed-3" ${sel('termType','fixed-3')}>Fixed - 3 month</option>
            <option value="fixed-6" ${sel('termType','fixed-6')}>Fixed - 6 month</option>
            <option value="fixed-12" ${sel('termType','fixed-12')}>Fixed - 12 month</option>
          </select>
        </div>
        <div><label>Monthly storage fee ($)</label>
          <input type="number" name="monthlyFee" min="0" step="1" value="${esc(t.monthlyFee || '')}" required></div>
      </div>
      <div class="row">
        <div><label>Payment schedule</label>
          <select name="paymentSchedule">
            <option value="monthly" ${sel('paymentSchedule','monthly')}>Monthly</option>
            <option value="prepaid" ${sel('paymentSchedule','prepaid')}>Prepaid</option>
          </select></div>
        <div><label>Payment method</label>
          <select name="paymentMethod">
            <option value="cash" ${sel('paymentMethod','cash')}>Cash</option>
            <option value="zelle" ${sel('paymentMethod','zelle')}>Zelle</option>
            <option value="card" ${sel('paymentMethod','card')}>Card (+3%)</option>
          </select></div>
      </div>
      <div class="row">
        <div><label>Agreement date</label><input type="date" name="agreementDate" value="${esc(t.agreementDate || '')}"></div>
        <div><label>Start date</label><input type="date" name="startDate" value="${esc(t.startDate || '')}"></div>
      </div>
      <div style="margin-top:18px;display:flex;gap:10px;">
        <button class="btn">Save</button>
        <a class="btn accent" href="/contract/${esc(r.id)}" target="_blank">Generate contract &rarr;</a>
      </div>
    </form>
  </div>` : '';

  res.send(layout('Rental file', `
    <p><a href="/">&larr; Dashboard</a></p>
    <h1>${esc((r.client && r.client.name) || 'New rental')}</h1>
    ${linkCard}${infoCard}${priceCard}
  `));
});

// ---------- ADMIN: save term & rate ----------
app.post('/admin/:id/terms', (req, res) => {
  const r = db.findById(req.params.id);
  if (!r) return res.status(404).send('Not found');
  const b = req.body;
  db.update(r.id, {
    status: 'active',
    finalizedAt: Date.now(),
    terms: {
      termType: b.termType,
      monthlyFee: b.monthlyFee,
      paymentSchedule: b.paymentSchedule,
      paymentMethod: b.paymentMethod,
      agreementDate: b.agreementDate,
      startDate: b.startDate,
    },
  });
  res.redirect(`/admin/${r.id}`);
});

// ---------- CLIENT: intake form ----------
app.get('/intake/:token', (req, res) => {
  const r = db.findByToken(req.params.token);
  if (!r) return res.status(404).send(layout('Link expired', '<div class="card"><h1>This link is not valid.</h1><p class="muted">Please contact TonTon Trailer Rentals for a new link.</p></div>'));

  if (r.client) {
    return res.send(layout('Received', `<div class="card">
      <h1>Thanks, ${esc(r.client.name)}!</h1>
      <p class="lead">We've received your information. TonTon Trailer Rentals will follow up with your storage agreement.</p>
    </div>`));
  }

  res.send(layout('Storage intake', `
    <div class="card">
      <h1>Storage Intake Form</h1>
      <p class="lead">Fill in your details below. This goes straight to TonTon Trailer Rentals to prepare your storage agreement. Fields marked * are required.</p>
      <form method="POST" action="/intake/${esc(r.token)}">
        <fieldset class="fieldset"><legend>Your contact</legend>
          <label>Full name *</label><input type="text" name="name" required>
          <div class="row">
            <div><label>Phone *</label><input type="tel" name="phone" required></div>
            <div><label>Email *</label><input type="email" name="email" required></div>
          </div>
        </fieldset>

        <fieldset class="fieldset"><legend>What you're storing</legend>
          <p class="muted" style="margin:6px 0 0;">Enter a quantity for each type you're storing (leave at 0 if none).</p>
          <div class="row3">
            <div><label>Boats</label><input type="number" name="boat" min="0" value="0"></div>
            <div><label>Trailers</label><input type="number" name="trailer" min="0" value="0"></div>
            <div><label>RVs</label><input type="number" name="rv" min="0" value="0"></div>
            <div><label>Vehicles</label><input type="number" name="vehicle" min="0" value="0"></div>
          </div>
          <label>Other (describe)</label><input type="text" name="other" placeholder="e.g. jet ski, container">
          <label>Make / Model *</label><input type="text" name="makeModel" required>
          <label>Length (overall) *</label><input type="text" name="length" placeholder="e.g. 24 ft" required>
          <label>License / Registration #</label><input type="text" name="licenseReg">
          <label>Insurance Carrier / Policy #</label><input type="text" name="insurance">
        </fieldset>

        <p class="muted">By submitting, you confirm this information is accurate. Final term, rate, and agreement will be provided by TonTon Trailer Rentals.</p>
        <button class="btn" style="margin-top:8px;">Submit my information</button>
      </form>
    </div>
  `));
});

// ---------- CLIENT: submit intake ----------
app.post('/intake/:token', (req, res) => {
  const r = db.findByToken(req.params.token);
  if (!r) return res.status(404).send('Invalid link');
  if (r.client) return res.redirect(`/intake/${r.token}`);
  const b = req.body;
  db.update(r.id, {
    status: 'submitted',
    submittedAt: Date.now(),
    client: {
      name: b.name, phone: b.phone, email: b.email,
      property: {
        boat: b.boat, trailer: b.trailer, rv: b.rv, vehicle: b.vehicle, other: b.other,
        makeModel: b.makeModel, length: b.length, licenseReg: b.licenseReg, insurance: b.insurance,
      },
    },
  });
  res.redirect(`/intake/${r.token}`);
});

// ---------- Contract ----------
app.get('/contract/:id', (req, res) => {
  const r = db.findById(req.params.id);
  if (!r) return res.status(404).send('Not found');
  if (!r.client) return res.status(400).send('Client info not submitted yet.');
  res.send(renderContract(r));
});

app.listen(PORT, () => console.log(`TonTon Storage running at http://localhost:${PORT}`));
