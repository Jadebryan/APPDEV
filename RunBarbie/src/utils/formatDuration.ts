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
