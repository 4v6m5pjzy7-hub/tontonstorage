import Link from 'next/link';
import { getSupabase, supabaseConfigured } from '../../lib/supabase.js';
import { requireAuth } from '../auth.js';
import { createInvoice, addService, deleteService } from '../actions.js';
import SubmitButton from '../SubmitButton.js';
import { money, prettyDate, invoiceTotals, invoiceNumber } from '../../lib/format.js';

export const dynamic = 'force-dynamic';

export default async function Invoices({ searchParams }) {
  requireAuth();
  if (!supabaseConfigured()) return null;
  const sb = getSupabase();

  const [{ data: invoices = [], error }, { data: services = [] }] = await Promise.all([
    sb.from('invoices').select('*').order('created_at', { ascending: false }),
    sb.from('invoice_services').select('*').order('name'),
  ]);

  if (error) {
    return (
      <div className="wrap">
        <div className="card banner err">
          Could not load invoices: {error.message}. Did you run <code>supabase/invoices.sql</code> in Supabase?
        </div>
      </div>
    );
  }

  const outstanding = invoices
    .filter((i) => i.status !== 'paid')
    .reduce((s, i) => s + invoiceTotals(i.items, i.tax_rate).total, 0);

  return (
    <div className="wrap">
      <p><Link href="/">← Rentals</Link></p>

      <div className="pagehead">
        <div className="titles">
          <h1>Invoices</h1>
          <p className="lead" style={{ margin: 0 }}>
            One-off jobs like boat stands or a wash-rack move. Separate from storage contracts.
          </p>
        </div>
        <div className="acts">
          <form action={createInvoice}><SubmitButton className="btn blue" pendingText="Creating…">+ New invoice</SubmitButton></form>
        </div>
      </div>

      {searchParams?.deleted === '1' && <div className="banner ok">Invoice deleted.</div>}
      {searchParams?.service === '1' && <div className="banner ok">Service added to the dropdown.</div>}

      {outstanding > 0 && (
        <div className="banner info"><strong>{money(outstanding)}</strong> outstanding across unpaid invoices.</div>
      )}

      <div className="card">
        <h2>All invoices</h2>
        {invoices.length === 0 ? (
          <div className="empty">No invoices yet. Create one to get started.</div>
        ) : (
          <div className="table-wrap">
            <table className="responsive">
              <thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {invoices.map((i) => {
                  const t = invoiceTotals(i.items, i.tax_rate);
                  return (
                    <tr key={i.id}>
                      <td data-label=""><strong>{invoiceNumber(i)}</strong></td>
                      <td data-label="Customer"><span>{i.customer_name}</span></td>
                      <td data-label="Date"><span>{prettyDate(i.issued_on)}</span></td>
                      <td data-label="Total"><span>{money(t.total)}</span></td>
                      <td data-label="Status" className="cell-stage">
                        <span className="pills">
                          <span className={`pill ${i.status === 'paid' ? 'lc-paid' : i.status === 'sent' ? 'lc-signed_unpaid' : 'lc-awaiting'}`}>
                            {i.status === 'paid' ? 'Paid' : i.status === 'sent' ? 'Sent, unpaid' : 'Draft'}
                          </span>
                        </span>
                      </td>
                      <td data-label="">
                        <Link className="btn alt" style={{ padding: '7px 14px', fontSize: 13 }} href={`/invoices/${i.id}`}>Open →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Services in the dropdown</h2>
        <p className="muted">
          These show up when building an invoice. Add new ones as you start offering them.
        </p>
        {services.length > 0 && (
          <div className="table-wrap">
            <table className="responsive">
              <thead><tr><th>Service</th><th>Default rate</th><th></th></tr></thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id}>
                    <td data-label=""><strong>{s.name}</strong></td>
                    <td data-label="Default rate"><span>{s.default_rate != null ? money(s.default_rate) : '—'}</span></td>
                    <td data-label="">
                      <form action={deleteService}>
                        <input type="hidden" name="id" value={s.id} />
                        <button className="btn ghost" style={{ padding: '6px 12px', fontSize: 12 }}>Remove</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form action={addService} style={{ marginTop: 16 }}>
          <div className="row">
            <div><label>New service name *</label>
              <input type="text" name="name" required placeholder="e.g. Shrink wrap removal" /></div>
            <div><label>Default rate ($)</label>
              <input type="number" name="default_rate" step="0.01" min="0" placeholder="optional" /></div>
          </div>
          <div className="actions">
            <SubmitButton className="btn alt" pendingText="Adding…">+ Add service</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
