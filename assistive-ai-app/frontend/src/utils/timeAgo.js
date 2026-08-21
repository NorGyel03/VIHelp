/**
 * Returns a human-readable relative timestamp.
 * e.g. "Just now", "3m ago", "2h ago", "5d ago", "Jan 12"
 */
export function timeAgo(dateString) {
  if (!dateString) return '';

  const now  = new Date();
  const past = new Date(dateString);

  // Guard against invalid dates
  if (isNaN(past.getTime())) return '';

  const diffMs  = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 15)  return 'Just now';
  if (diffSec < 60)  return `${diffSec}s ago`;
  if (diffMin < 60)  return `${diffMin}m ago`;
  if (diffHr  < 24)  return `${diffHr}h ago`;
  if (diffDay <  7)  return `${diffDay}d ago`;

  return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Returns a short formatted time string: "9:04 AM"
 */
export function formatTime(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Returns a full date string: "May 6, 2026"
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
