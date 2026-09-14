import type { DeliveryStatus, UserRole } from "./constants";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "INVALID_JSON"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR";

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiFailure {
  success: false;
  code: ApiErrorCode;
  message: string;
  errors: Record<string, string> | null;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface MobileAuthUser {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
}

export interface MobileAuthTokenData {
  access_token: string;
  token_type: "Bearer";
  expires_at: string;
  expires_in: number;
  user: MobileAuthUser;
}

export interface MobileSessionData {
  expires_at: string;
  user: MobileAuthUser;
}

export interface PaymentCheckout {
  provider: "paystack";
  redirect_url: string;
  checkout_id: string;
  demo_mode: boolean;
  payment_id: number;
  delivery_id: number;
}

export interface DeliveryStatusLog {
  id: number;
  status: DeliveryStatus;
  note: string | null;
  created_at: string;
  updated_by_name: string | null;
}
