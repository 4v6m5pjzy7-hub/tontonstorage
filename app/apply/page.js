import { supabaseConfigured } from '../../lib/supabase.js';
import { submitPublicIntake } from '../actions.js';
import IntakeForm from '../IntakeForm.js';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Storage Intake - TonTon Trailer Rentals',
  description: 'Request storage with TonTon Trailer Rentals.',
};

// Public, reusable intake link for the website / social media. Every submission
// creates its own independent record, so many people can use the same link and
// never cross paths.
export default function Apply({ searchParams }) {
  if (!supabaseConfigured()) {
    return <div className="wrap"><div className="card"><h1>Not available</h1></div></div>;
  }

  if (searchParams?.done === '1') {
    return (
      <div className="wrap">
        <div className="card" style={{ textAlign: 'center', padding: '36px 24px' }}>
          <div style={{
            width: 62, height: 62, borderRadius: '50%', background: '#e5f5ec',
            color: 'var(--ok)', fontSize: 34, lineHeight: '62px', margin: '0 auto 14px',
          }}>&#10003;</div>
          <h1 style={{ marginBottom: 6 }}>Submitted successfully</h1>
          <p className="lead" style={{ marginBottom: 18 }}>
            Thanks! We&apos;ve got your details and TonTon Trailer Rentals will be in touch
            shortly with your storage agreement.
          </p>
          <div className="banner ok" style={{ textAlign: 'left' }}>
            <strong>Nothing else to do.</strong> Watch your email for our follow-up. Need to add
            another vehicle or trailer? Just fill the form out again.
          </div>
          <p className="muted" style={{ marginTop: 16 }}>
            <a href="/apply">Submit another</a> &nbsp;·&nbsp; Questions? Call 954-298-7794.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      {searchParams?.e === '1' && (
        <div className="banner err">Please enter at least your name and email.</div>
      )}
      <IntakeForm action={submitPublicIntake} />
    </div>
  );
}
