/**
 * Returns relative time string (e.g. "2h ago", "Yesterday")
 */
export function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 172800) return 'Yesterday';
  // For up to 7 days, show days (e.g. "3d ago").
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d ago`;
  // Beyond a week, show the calendar date.
  return date.toLocaleDateString();
}
