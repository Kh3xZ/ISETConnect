import type { Role, UserSummary } from '../services/api';

export const DEPARTMENT_LABELS: Record<string, string> = {
  GENIE_CIVIL: 'Génie Civil',
  GENIE_ELECTRIQUE: 'Génie Électrique',
  GENIE_MECANIQUE: 'Génie Mécanique',
  GESTION: 'Gestion',
  TECHNOLOGIES_INFORMATIQUE: "Technologies de l'Informatique",
};

export const departmentLabel = (code?: string | null) => (code ? DEPARTMENT_LABELS[code] ?? code : null);

export const ROLE_LABELS: Record<Role, string> = {
  STUDENT: 'Student',
  PROF: 'Professor',
  ADMIN: 'Admin',
};

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
  return (first + second).toUpperCase();
}

/** "Génie Civil · L3-BAT1" — department + class, whichever exist. */
export function authorMeta(a: UserSummary): string {
  return [departmentLabel(a.department), a.classe].filter(Boolean).join(' · ');
}

/** Compact relative time like X: now, 18m, 3h, 2d, then a short date. */
export function timeAgo(value: string | number): string {
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** "PFE-2027" -> "PF", "Spring Boot Lab" -> "SB" */
export function monogramOf(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s-]/gu, '').split(/[\s-]+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Short file-type label for a file name: "course.pdf" -> "PDF". */
export function fileKind(name?: string | null): string {
  const ext = (name ?? '').split('.').pop()?.toLowerCase() ?? '';
  if (!name || !name.includes('.')) return 'FILE';
  if (ext === 'pdf') return 'PDF';
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) return 'DOC';
  if (['ppt', 'pptx', 'odp'].includes(ext)) return 'PPT';
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return 'XLS';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'ZIP';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic'].includes(ext)) return 'IMG';
  if (['txt', 'md'].includes(ext)) return 'TXT';
  if (['mp4', 'mov', 'mkv', 'avi'].includes(ext)) return 'VID';
  return ext.slice(0, 4).toUpperCase() || 'FILE';
}

export function formatBytes(bytes?: number | null): string {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatCount(value: number): string {
  if (value < 1_000) return String(value);
  const units = ['K', 'M', 'B'];
  let scaled = value;
  let unitIndex = -1;
  do {
    scaled /= 1_000;
    unitIndex += 1;
  } while (scaled >= 1_000 && unitIndex < units.length - 1);
  const formatted = Number(scaled.toFixed(1)).toString();
  return `${formatted}${units[unitIndex]}`;
}
