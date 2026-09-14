export const API_CONTRACT_VERSION = "1" as const;
export const API_CONTRACT_VERSION_HEADER = "X-EzyGo-API-Version" as const;

export const USER_ROLES = ["customer", "driver", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const DRIVER_STATUSES = ["active", "inactive", "suspended"] as const;
export type DriverStatus = (typeof DRIVER_STATUSES)[number];

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

export const VALID_TRANSITIONS: Readonly<
  Record<DeliveryStatus, readonly DeliveryStatus[]>
> = {
  pending: ["quoted", "cancelled"],
  quoted: ["confirmed", "cancelled"],
  confirmed: ["paid", "cancelled"],
  paid: ["assigned", "cancelled"],
  assigned: ["picked_up", "cancelled"],
  picked_up: ["in_transit"],
  in_transit: ["delivered", "failed"],
  delivered: [],
  failed: [],
  cancelled: [],
};

export function isValidTransition(
  from: DeliveryStatus,
  to: DeliveryStatus
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export const STATUS_LABELS: Readonly<Record<DeliveryStatus, string>> = {
  pending: "Pending",
  quoted: "Quoted",
  confirmed: "Confirmed",
  paid: "Paid",
  assigned: "Driver Assigned",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  delivered: "Delivered",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const CAPE_TOWN_SERVICE_BOUNDS = {
  north: -33.45,
  south: -34.37,
  west: 18.28,
  east: 19.16,
} as const;

export interface ServiceAreaAddress {
  formatted_address: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export function isInCapeTownServiceArea(address: ServiceAreaAddress): boolean {
  const { latitude, longitude } = address;
  if (latitude === undefined || longitude === undefined) return false;

  const insideBounds =
    latitude >= CAPE_TOWN_SERVICE_BOUNDS.south &&
    latitude <= CAPE_TOWN_SERVICE_BOUNDS.north &&
    longitude >= CAPE_TOWN_SERVICE_BOUNDS.west &&
    longitude <= CAPE_TOWN_SERVICE_BOUNDS.east;

  const locationText = `${address.city ?? ""} ${address.formatted_address}`;
  return insideBounds && /\bcape town\b/i.test(locationText);
}
