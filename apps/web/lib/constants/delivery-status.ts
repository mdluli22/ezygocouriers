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
  pending:    "bg-slate-100 text-slate-700",
  quoted:     "bg-blue-100 text-blue-700",
  confirmed:  "bg-indigo-100 text-indigo-700",
  paid:       "bg-amber-100 text-amber-700",
  assigned:   "bg-cyan-100 text-cyan-700",
  picked_up:  "bg-orange-100 text-orange-700",
  in_transit: "bg-yellow-100 text-yellow-800",
  delivered:  "bg-green-100 text-green-700",
  failed:     "bg-red-100 text-red-700",
  cancelled:  "bg-gray-100 text-gray-600",
};
