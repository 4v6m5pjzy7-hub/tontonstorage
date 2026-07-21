// Small shared server-component helpers.

export const STATUS_LABEL = {
  pending: 'Awaiting client',
  submitted: 'Ready to price',
  active: 'Active',
  renewal_notified: 'Renewal sent',
  extend_requested: 'Wants to extend',
  vacating: 'Vacating',
  renewed: 'Renewed',
  expired: 'Expired',
};

export function StatusPill({ status }) {
  return <span className={`pill ${status}`}>{STATUS_LABEL[status] || status}</span>;
}

// Where a rental sits in the contract lifecycle. Drives the dashboard tabs.
export const TABS = [
  { key: 'all', label: 'All' },
  { key: 'awaiting', label: 'Awaiting info' },
  { key: 'to_price', label: 'To price' },
  { key: 'to_send', label: 'Ready to send' },
  { key: 'sent_unsigned', label: 'Sent, not signed' },
  { key: 'needs_countersign', label: 'Needs Anton’s signature' },
  { key: 'signed_unpaid', label: 'Signed, not paid' },
  { key: 'paid', label: 'Paid / active' },
];

// Shown separately from the pipeline tabs.
export const DELETED_TAB = { key: 'deleted', label: 'Recently deleted' };
export const RESTORE_WINDOW_DAYS = 30;

export function lifecycle(r) {
  const t = r.terms || {};
  if (!r.client) return { key: 'awaiting', label: 'Awaiting info' };
  if (!t.monthlyFee) return { key: 'to_price', label: 'Needs term & rate' };
  if (t.payment?.paidAt) return { key: 'paid', label: 'Paid / active' };
  // Customer has signed but Anton hasn't countersigned yet.
  if (t.signature?.signedAt && !t.providerSignature?.signedAt) {
    return { key: 'needs_countersign', label: 'Needs Anton’s signature' };
  }
  if (t.signedAt) return { key: 'signed_unpaid', label: 'Signed, not paid' };
  if (t.contractSentAt) return { key: 'sent_unsigned', label: 'Sent, not signed' };
  return { key: 'to_send', label: 'Ready to send' };
}

export function LifecyclePill({ rental }) {
  const { key, label } = lifecycle(rental);
  return <span className={`pill lc-${key}`}>{label}</span>;
}

// Renewal states are shown alongside the lifecycle when they apply.
const RENEWAL_STATES = ['renewal_notified', 'extend_requested', 'vacating', 'renewed'];
export function RenewalPill({ status }) {
  if (!RENEWAL_STATES.includes(status)) return null;
  return <span className={`pill ${status}`} style={{ marginLeft: 6 }}>{STATUS_LABEL[status]}</span>;
}
