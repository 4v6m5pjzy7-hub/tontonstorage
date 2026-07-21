'use client';

// Permanent removal before the 30-day window is up. Confirms first, because
// this one really is unrecoverable.
export default function PurgeButton({ name }) {
  return (
    <button
      type="submit"
      className="btn ghost"
      style={{ padding: '6px 12px', fontSize: 13 }}
      onClick={(e) => {
        const who = name ? `"${name}"` : 'this rental';
        if (!confirm(`Permanently erase ${who} right now?\n\nThis skips the 30-day recovery window. The contract and any signatures are gone for good.`)) {
          e.preventDefault();
        }
      }}
    >
      Erase now
    </button>
  );
}
