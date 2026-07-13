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
