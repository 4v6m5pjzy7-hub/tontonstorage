import { login } from '../actions.js';

export const dynamic = 'force-dynamic';

export default function Login({ searchParams }) {
  return (
    <div className="wrap" style={{ maxWidth: 420 }}>
      <div className="card" style={{ marginTop: 40 }}>
        <h1>Staff login</h1>
        <p className="lead">Enter the password to manage rentals.</p>
        {searchParams?.e === '1' && <div className="banner err">Wrong password. Try again.</div>}
        <form action={login}>
          <input type="hidden" name="next" value={searchParams?.next || '/'} />
          <label>Password</label>
          <input type="password" name="password" autoFocus required />
          <button className="btn blue" style={{ marginTop: 16, width: '100%' }}>Log in</button>
        </form>
      </div>
    </div>
  );
}
