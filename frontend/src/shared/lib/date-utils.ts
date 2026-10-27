/**
 * Date formatting and Citizen's Charter SLA utilities.
 */

export function formatDate(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export function formatDateTime(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

export interface SlaInfo {
  daysAge: number;
  daysRemaining: number;
  isOverdue: boolean;
  tier: 'NORMAL' | 'APPROACHING' | 'OVERDUE';
  badgeColor: string;
  label: string;
}

export function calculateSla(createdAt?: string | null, dueDate?: string | null, status?: string): SlaInfo {
  const isTerminal = ['RESOLVED', 'DISPOSED', 'REJECTED'].includes(status || '');
  if (isTerminal) {
    return {
      daysAge: 0,
      daysRemaining: 0,
      isOverdue: false,
      tier: 'NORMAL',
      badgeColor: 'emerald',
      label: 'Closed / Complied',
    };
  }

  const now = new Date();
  const created = createdAt ? new Date(createdAt) : now;
  const targetDue = dueDate ? new Date(dueDate) : new Date(created.getTime() + 30 * 86400 * 1000);

  const diffMs = targetDue.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const ageMs = now.getTime() - created.getTime();
  const daysAge = Math.max(0, Math.floor(ageMs / (1000 * 60 * 60 * 24)));

  if (daysRemaining < 0) {
    return {
      daysAge,
      daysRemaining,
      isOverdue: true,
      tier: 'OVERDUE',
      badgeColor: 'rose',
      label: `SLA Breached (${Math.abs(daysRemaining)}d overdue)`,
    };
  }

  if (daysRemaining <= 6) {
    return {
      daysAge,
      daysRemaining,
      isOverdue: false,
      tier: 'APPROACHING',
      badgeColor: 'amber',
      label: `Urgent (${daysRemaining}d remaining)`,
    };
  }

  return {
    daysAge,
    daysRemaining,
    isOverdue: false,
    tier: 'NORMAL',
    badgeColor: 'emerald',
    label: `On Track (${daysRemaining}d left)`,
  };
}
