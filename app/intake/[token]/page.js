import { notFound } from 'next/navigation';
import { getSupabase, supabaseConfigured } from '../../../lib/supabase.js';
import { submitIntake } from '../../actions.js';
import IntakeForm from '../../IntakeForm.js';

export const dynamic = 'force-dynamic';

export default async function Intake({ params }) {
  if (!supabaseConfigured()) notFound();
  const sb = getSupabase();
  const { data: r } = await sb.from('rentals').select('*').eq('token', params.token).is('deleted_at', null).single();
  if (!r) {
    return (
      <div className="wrap"><div className="card">
        <h1>This link is not valid</h1>
        <p className="muted">Please contact TonTon Trailer Rentals for a new link. 954-298-7794</p>
      </div></div>
    );
  }

  if (r.client) {
    return (
      <div className="wrap">
        <div className="card" style={{ textAlign: 'center', padding: '36px 24px' }}>
          <div style={{
            width: 62, height: 62, borderRadius: '50%', background: '#e5f5ec',
            color: 'var(--ok)', fontSize: 34, lineHeight: '62px', margin: '0 auto 14px',
          }}>&#10003;</div>
          <h1 style={{ marginBottom: 6 }}>Submitted successfully</h1>
          <p className="lead" style={{ marginBottom: 18 }}>
            Thanks, {r.client.name}! We&apos;ve got your details and we&apos;ll be in touch shortly
            with your storage agreement.
          </p>
          <div className="banner ok" style={{ textAlign: 'left' }}>
            <strong>Nothing else to do right now.</strong> You don&apos;t need to submit again.
            TonTon Trailer Rentals will email you at {r.client.email}.
          </div>
          <p className="muted" style={{ marginTop: 16 }}>Questions? Call 954-298-7794.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <IntakeForm action={submitIntake} token={r.token} />
    </div>
  );
}
