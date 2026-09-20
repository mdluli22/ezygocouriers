import type { DeliveryStatus, DriverStatus, UserRole } from "./constants";

export interface AdminDelivery {
  id: number;
  tracking_number: string;
  status: DeliveryStatus;
  recipient_name: string;
  recipient_phone: string;
  parcel_description: string;
  package_type: string | null;
  package_category: string | null;
  fragile: boolean;
  require_pin: boolean;
  scheduled_time: string | null;
  created_at: string;
  updated_at: string;
  pickup_city: string | null;
  pickup_province: string | null;
  dropoff_city: string | null;
  dropoff_province: string | null;
  quote_amount: string | null;
  quote_currency: string | null;
  customer_name: string;
  customer_email: string;
  driver_name: string | null;
}

export interface AdminDriver {
  id: number;
  license_number: string | null;
  vehicle_type: string | null;
  vehicle_reg: string | null;
  status: DriverStatus;
  notes: string | null;
  created_at: string;
  user_id: number;
  full_name: string;
  email: string;
  phone: string | null;
  user_active: boolean;
  total_deliveries: string;
  completed_deliveries: string;
}

export interface AdminUser {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  auth_provider: "email" | "google";
  created_at: string;
}

export interface PricingRule {
  id: number;
  rule_name: string;
  flat_fee: string;
  currency: string;
  is_active: boolean;
  updated_at: string;
}
