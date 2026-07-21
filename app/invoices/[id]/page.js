import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabase, supabaseConfigured } from '../../../lib/supabase.js';
import { requireAuth } from '../../auth.js';
import { saveInvoice, emailInvoice, markInvoicePaid, deleteInvoice } from '../../actions.js';
import InvoiceEditor from '../../InvoiceEditor.js';
import SubmitButton from '../../SubmitButton.js';
import DeleteButton from '../../DeleteButton.js';
import { money, prettyDate, invoiceTotals, invoiceNumber } from '../../../lib/format.js';

export const dynamic = 'force-dynamic';

function appUrl() {
  return (process.env.APP_URL || 'http://localhost:3500').replace(/\/+$/, '');
}

export default async function InvoicePage({ params, searchParams }) {
  requireAuth();
  if (!supabaseConfigured()) notFound();
  const sb = getSupabase();

  const [{ data: inv }, { data: services = [] }] = await Promise.all([
    sb.from('invoices').select('*').eq('id', params.id).single(),
    sb.from('invoice_services').select('*').eq('active', true).order('name'),
  ]);
  if (!inv) notFound();

  const t = invoiceTotals(inv.items, inv.tax_rate);
  const publicUrl = `${appUrl()}/invoice/${inv.token}`;

  return (
    <div className="wrap">
      <p><Link href="/invoices">← Invoices</Link></p>

      <div className="pagehead">
        <div className="titles">
          <h1>{invoiceNumber(inv)}</h1>
          <p className="lead" style={{ margin: 0 }}>
            {inv.status === 'paid'
              ? `Paid ${prettyDate(inv.paid_on)} · ${money(t.total)}`
              : `${money(t.total)} due${inv.sent_at ? ' · sent to customer' : ' · not sent yet'}`}
          </p>
        </div>
        <div className="acts">
          <a className="btn alt" href={`/invoice/${inv.token}`} target="_blank" rel="noreferrer">Print / PDF →</a>
        </div>
      </div>

      {searchParams?.saved === '1' && <div className="banner ok">Invoice saved.</div>}
      {searchParams?.sent === '1' && <div className="banner ok">Invoice emailed to {inv.customer_email}.</div>}
      {searchParams?.e === 'noemail' && <div className="banner err">Add the customer&apos;s email address first, then save.</div>}

      <InvoiceEditor invoice={inv} services={services} action={saveInvoice} />

      <div className="card">
        <h2>Send &amp; payment</h2>
        <p className="muted">Save your changes first, then send. The customer gets a link to view and print it.</p>
        <div className="actions">
          <form action={emailInvoice}>
            <input type="hidden" name="id" value={inv.id} />
            <SubmitButton className="btn blue" pendingText="Sending…">
              {inv.sent_at ? 'Re-send invoice email' : 'Email invoice to customer'}
            </SubmitButton>
          </form>

          {inv.status === 'paid' ? (
            <form action={markInvoicePaid}>
              <input type="hidden" name="id" value={inv.id} />
              <input type="hidden" name="unpay" value="1" />
              <button className="btn ghost">Mark unpaid</button>
            </form>
          ) : (
            <form action={markInvoicePaid} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <input type="hidden" name="id" value={inv.id} />
              <div>
                <label style={{ marginTop: 0 }}>Date paid</label>
                <input type="date" name="paid_on" defaultValue={new Date().toISOString().slice(0, 10)} />
              </div>
              <button className="btn">Mark paid</button>
            </form>
          )}
        </div>

        <p className="muted" style={{ marginTop: 16 }}>
          Customer link: <code style={{ fontSize: 12 }}>{publicUrl}</code>
        </p>
      </div>

      <div className="card danger-zone">
        <h2 style={{ color: '#b3261e' }}>Delete this invoice</h2>
        <p className="muted">Permanently removes it. Invoice numbers are not reused.</p>
        <form action={deleteInvoice} style={{ marginTop: 12 }}>
          <input type="hidden" name="id" value={inv.id} />
          <DeleteButton name={`${invoiceNumber(inv)} (${inv.customer_name})`} />
        </form>
      </div>
    </div>
  );
}
