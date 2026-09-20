import type { DeliveryStatus } from "./constants";
import type { DeliveryStatusLog, PaymentCheckout } from "./models";

/** Wire values: decimals and timestamps are strings in JSON. */
export interface Address {
  id: number;
  formatted_address: string;
  street_address: string;
  suburb: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string;
  latitude: string | null;
  longitude: string | null;
  building_or_business: string | null;
  apt_suite: string | null;
  meeting_option: "meet_at_curb" | "meet_at_door" | "leave_at_door" | null;
  notes: string | null;
}

export interface CustomerDeliverySummary {
  id: number;
  tracking_number: string;
  status: DeliveryStatus;
  recipient_name: string;
  recipient_phone: string;
  parcel_description: string;
  package_type: "small" | "medium" | "large" | null;
  package_category: string | null;
  fragile: boolean;
  require_pin: boolean;
  scheduled_time: string | null;
  created_at: string;
  updated_at: string;
  pickup_street: string;
  pickup_city: string | null;
  dropoff_street: string;
  dropoff_city: string | null;
  quote_amount: string | null;
  quote_currency: string | null;
}

export interface DriverDeliverySummary extends CustomerDeliverySummary {
  pickup_contact_name: string;
  pickup_contact_phone: string;
  special_instructions: string | null;
  pickup_suburb: string | null;
  pickup_province: string | null;
  dropoff_suburb: string | null;
  dropoff_province: string | null;
}

/** Explicit public delivery fields. PIN values/hashes never belong in transport types. */
export interface DeliveryDetail extends DriverDeliverySummary {
  customer_id: number;
  assigned_driver_id: number | null;
  pickup_address_id: number;
  dropoff_address_id: number;
  quote_id: number | null;
  recipient_email: string | null;
  pin_verified_at: string | null;
  delivery_pin_sent_at: string | null;
  delivery_completed_email_sent_at: string | null;
  pickup_postal_code: string | null;
  dropoff_postal_code: string | null;
}

export interface CustomerDeliveryDetail extends DeliveryDetail {
  pickup_address_notes: string | null;
  dropoff_address_notes: string | null;
  quote_status: "pending" | "accepted" | "expired" | "rejected" | null;
  driver_name: string | null;
  driver_phone: string | null;
}

export interface DriverDeliveryDetail extends DeliveryDetail {
  pickup_notes: string | null;
  dropoff_notes: string | null;
  customer_name: string;
  customer_phone: string | null;
}

export interface DeliveryDetailResponse<T extends DeliveryDetail> {
  delivery: T;
  logs: DeliveryStatusLog[];
}

export interface CreateDeliveryResponse {
  id: number;
  trackingNumber: string;
  quote: { amount: number; currency: string };
  payment: PaymentCheckout;
}

export interface DriverLocationResponse {
  assignment: { deliveryId: number; driverId: number; distanceKm: number | null } | null;
}
