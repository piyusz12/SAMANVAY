/**
 * Date formatting and Citizen's Charter SLA utilities.
 */

export function parseUtcDate(isoString?: string | null): Date | null {
  if (!isoString) return null;
  const trimmed = isoString.trim();
  if (!trimmed) return null;
  // If no timezone indicator (Z or +/-offset), treat as UTC
  const normalized = (trimmed.includes('Z') || /[+-]\d{2}(:\d{2})?$/.test(trimmed))
    ? trimmed
    : `${trimmed}Z`;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? new Date(isoString) : d;
}

export function formatDate(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = parseUtcDate(isoString);
    if (!d || isNaN(d.getTime())) return isoString;
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
    const d = parseUtcDate(isoString);
    if (!d || isNaN(d.getTime())) return isoString;
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
  const created = parseUtcDate(createdAt) || now;
  const targetDue = parseUtcDate(dueDate) || new Date(created.getTime() + 30 * 86400 * 1000);

  const diffMs = targetDue.getTime() - now.getTime();
  const ageMs = now.getTime() - created.getTime();
  const daysAge = Math.max(0, Math.floor(ageMs / (1000 * 60 * 60 * 24)));

  // If deadline has passed, mark overdue immediately
  if (diffMs < 0) {
    const daysOverdue = Math.max(1, Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24)));
    return {
      daysAge,
      daysRemaining: -daysOverdue,
      isOverdue: true,
      tier: 'OVERDUE',
      badgeColor: 'rose',
      label: `SLA Breached (${daysOverdue}d overdue)`,
    };
  }

  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

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
