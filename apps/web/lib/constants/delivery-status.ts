import type { DeliveryStatus } from "@ezygo/contracts";

export {
  DELIVERY_STATUSES,
  STATUS_LABELS,
  VALID_TRANSITIONS,
  isValidTransition,
  type DeliveryStatus,
} from "@ezygo/contracts";

/**
 * Tailwind color classes for status badges.
 * Uses the EzyGo design system.
 */
export const STATUS_COLORS: Record<DeliveryStatus, string> = {
  pending:    "bg-slate-100 text-slate-700 dark:bg-slate-950 dark:text-slate-300",
  quoted:     "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  confirmed:  "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  paid:       "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  assigned:   "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  picked_up:  "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  in_transit: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  delivered:  "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  failed:     "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  cancelled:  "bg-gray-100 text-gray-600 dark:bg-gray-950 dark:text-gray-300",
};
