export const DELIVERY_STATUSES = [
  "pending",
  "quoted",
  "confirmed",
  "paid",
  "assigned",
  "picked_up",
  "in_transit",
  "delivered",
  "failed",
  "cancelled",
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

/**
 * Defines which status transitions are valid.
 * Key = current status, Value = allowed next statuses.
 */
export const VALID_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  pending:    ["quoted", "cancelled"],
  quoted:     ["confirmed", "cancelled"],
  confirmed:  ["paid", "cancelled"],
  paid:       ["assigned", "cancelled"],
  assigned:   ["picked_up", "cancelled"],
  picked_up:  ["in_transit"],
  in_transit: ["delivered", "failed"],
  delivered:  [],
  failed:     [],
  cancelled:  [],
};

/**
 * Check whether a status transition is valid.
 */
export function isValidTransition(
  from: DeliveryStatus,
  to: DeliveryStatus
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Human-readable status labels for UI display.
 */
export const STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending:    "Pending",
  quoted:     "Quoted",
  confirmed:  "Confirmed",
  paid:       "Paid",
  assigned:   "Driver Assigned",
  picked_up:  "Picked Up",
  in_transit: "In Transit",
  delivered:  "Delivered",
  failed:     "Failed",
  cancelled:  "Cancelled",
};

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
