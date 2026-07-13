// Optional server-side email. Only active when SMTP env vars are set:
//   TONTON_SMTP_HOST, TONTON_SMTP_PORT, TONTON_SMTP_USER, TONTON_SMTP_PASS
//   TONTON_FROM (optional, defaults to info@thetrailerteam.com)
// Until then, the admin UI falls back to one-click mailto:/sms: buttons.

let nodemailer = null;
try { nodemailer = require('nodemailer'); } catch (e) { /* not installed yet */ }

function isConfigured() {
  return !!(nodemailer && process.env.TONTON_SMTP_HOST && process.env.TONTON_SMTP_USER && process.env.TONTON_SMTP_PASS);
}

function fromAddress() {
  return process.env.TONTON_FROM || 'TonTon Trailer Rentals <info@thetrailerteam.com>';
}

async function sendIntakeLink(toEmail, link) {
  if (!isConfigured()) throw new Error('SMTP not configured');
  const transport = nodemailer.createTransport({
    host: process.env.TONTON_SMTP_HOST,
    port: Number(process.env.TONTON_SMTP_PORT) || 587,
    secure: Number(process.env.TONTON_SMTP_PORT) === 465,
    auth: { user: process.env.TONTON_SMTP_USER, pass: process.env.TONTON_SMTP_PASS },
  });
  await transport.sendMail({
    from: fromAddress(),
    to: toEmail,
    subject: 'Your TonTon storage intake form',
    text: intakeMessage(link),
    html: `<p>Thanks for choosing TonTon Trailer Rentals. Please fill out your storage details here:</p>
           <p><a href="${link}">${link}</a></p>
           <p>Once we receive your info we will follow up with your storage agreement.</p>
           <p>TonTon Trailer Rentals LLC &middot; 954-298-7794</p>`,
  });
}

function intakeMessage(link) {
  return `Thanks for choosing TonTon Trailer Rentals. Please fill out your storage details here:
${link}

Once we receive your info we will follow up with your storage agreement.
TonTon Trailer Rentals LLC, 954-298-7794`;
}

module.exports = { isConfigured, sendIntakeLink, intakeMessage };
