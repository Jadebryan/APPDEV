/**
 * Format seconds as "Xh Ym" or "Ym" or "Xs" for display.
 */
export function formatDurationSeconds(totalSeconds: number): string {
  if (totalSeconds < 0 || !Number.isFinite(totalSeconds)) return '0s';
  const sec = Math.floor(totalSeconds);
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
}

/**
 * Format total minutes as "Xh Ym" or "Ym" for display.
 * Used for post duration, goals target duration, and weekly stats.
 */
export function formatDurationMinutes(totalMinutes: number): string {
  if (totalMinutes < 0 || !Number.isFinite(totalMinutes)) return '';
  const mins = Math.round(totalMinutes);
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}
