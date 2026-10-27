/**
 * SAMANVAY Frontend — General Utilities & Formatters
 */

export function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return isoString;
  }
}

export function formatDateTime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

export function getStatusBadgeClass(status) {
  switch (status) {
    case 'LODGED':
      return 'badge-blue';
    case 'UNDER_INQUIRY':
      return 'badge-indigo';
    case 'SHOW_CAUSE_ISSUED':
      return 'badge-amber';
    case 'HEARING_SCHEDULED':
      return 'badge-purple';
    case 'RESOLVED':
    case 'DISPOSED':
      return 'badge-green';
    case 'OVERDUE':
      return 'badge-red';
    default:
      return 'badge-gray';
  }
}

export function getPriorityBadgeClass(priority) {
  switch (priority) {
    case 'CRITICAL':
      return 'badge-red font-bold';
    case 'HIGH':
      return 'badge-amber';
    case 'MEDIUM':
      return 'badge-blue';
    case 'LOW':
      return 'badge-gray';
    default:
      return 'badge-gray';
  }
}
