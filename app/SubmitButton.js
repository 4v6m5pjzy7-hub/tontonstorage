'use client';
import { useFormStatus } from 'react-dom';

// Disables itself and shows progress while the server action runs, so a slow
// submit can't be double-clicked into duplicate submissions.
export default function SubmitButton({
  children,
  pendingText = 'Submitting…',
  className = 'btn blue',
  style,
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      aria-busy={pending}
      style={{ ...style, ...(pending ? { opacity: 0.65, cursor: 'wait' } : null) }}
    >
      {pending ? pendingText : children}
    </button>
  );
}
