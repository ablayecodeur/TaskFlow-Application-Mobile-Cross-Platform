import * as Crypto from 'expo-crypto';

export function generateId(): string {
  return Crypto.randomUUID();
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `Il y a ${Math.abs(diffDays)}j`;
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Demain';
  if (diffDays < 7) return `Dans ${diffDays}j`;
  return formatDate(iso);
}

export function isTokenExpired(expiresIn: number): boolean {
  return expiresIn <= 60;
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent': return '#FF4757';
    case 'high':   return '#FF6B35';
    case 'medium': return '#FFB347';
    case 'low':    return '#7BED9F';
    default:       return '#A0AEC0';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':  return '#7BED9F';
    case 'in_progress': return '#6C63FF';
    case 'cancelled':  return '#A0AEC0';
    case 'pending':    return '#FFB347';
    default:           return '#A0AEC0';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'completed':  return 'Terminé';
    case 'in_progress': return 'En cours';
    case 'cancelled':  return 'Annulé';
    case 'pending':    return 'En attente';
    default:           return status;
  }
}

export function getPriorityLabel(priority: string): string {
  switch (priority) {
    case 'urgent': return 'Urgent';
    case 'high':   return 'Haute';
    case 'medium': return 'Moyenne';
    case 'low':    return 'Basse';
    default:       return priority;
  }
}

export function truncate(str: string, max: number): string {
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
