import { POSITION_MAP, POSITION_FULL, STATUS_MAP } from "@/lib/fpl/constants";

/**
 * Convert FPL price (integer * 10) to display string
 * e.g., 100 -> "10.0", 75 -> "7.5"
 */
export function formatPrice(cost: number): string {
  return (cost / 10).toFixed(1);
}

/**
 * Get position abbreviation from element_type
 */
export function getPosition(elementType: number): string {
  return POSITION_MAP[elementType] ?? "UNK";
}

/**
 * Get full position name from element_type
 */
export function getPositionFull(elementType: number): string {
  return POSITION_FULL[elementType] ?? "Unknown";
}

/**
 * Get player status info
 */
export function getStatus(status: string) {
  return STATUS_MAP[status] ?? { label: "Unknown", color: "text-gray-400" };
}

/**
 * Format large numbers with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format percentage string from API (e.g., "15.3" -> "15.3%")
 */
export function formatPercent(value: string): string {
  return `${value}%`;
}

/**
 * Calculate points per million
 */
export function pointsPerMillion(totalPoints: number, cost: number): string {
  if (cost === 0) return "0.0";
  return ((totalPoints / cost) * 10).toFixed(1);
}

/**
 * Format deadline time to readable string
 */
export function formatDeadline(deadline: string): string {
  const date = new Date(deadline);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 */
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSec = Math.abs(Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  const isFuture = diffMs > 0;
  const prefix = isFuture ? "in " : "";
  const suffix = isFuture ? "" : " ago";

  if (diffDay > 0) return `${prefix}${diffDay}d${suffix}`;
  if (diffHour > 0) return `${prefix}${diffHour}h${suffix}`;
  if (diffMin > 0) return `${prefix}${diffMin}m${suffix}`;
  return "just now";
}
