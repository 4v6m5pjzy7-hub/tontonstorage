'use client';

// Submit button that asks for confirmation first. Deleting a rental is
// permanent, so the customer name is shown in the prompt.
export default function DeleteButton({ name }) {
  return (
    <button
      type="submit"
      className="btn danger"
      onClick={(e) => {
        const who = name ? `"${name}"` : 'this unfilled rental';
        if (!confirm(`Permanently delete ${who}?\n\nThis removes the record and its intake link for good. This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      Delete this rental
    </button>
  );
}
