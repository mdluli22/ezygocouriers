import type { AddressInput, CreateDeliveryRequest, CreateDeliveryResponse, CustomerDeliverySummary, CustomerDeliveryDetail, DeliveryDetailResponse, PaymentCheckout } from "@ezygo/contracts";
import { authController } from "./auth/native-auth";
export interface PaymentVerification { delivery_id: number; status: string }
export const customerApi = {
  list: () => authController.request<CustomerDeliverySummary[]>("/api/deliveries"),
  detail: (id: number) => authController.request<DeliveryDetailResponse<CustomerDeliveryDetail>>(`/api/deliveries/${id}`),
  create: (input: CreateDeliveryRequest) => authController.request<CreateDeliveryResponse>("/api/deliveries", "POST", input),
  cancel: (id: number) => authController.request(`/api/deliveries/${id}`, "POST", { action: "cancel" }),
  checkout: (id: number) => authController.request<PaymentCheckout>("/api/payments/create", "POST", { delivery_id: id, payment_method: "paystack" }),
  verify: (input: { delivery_id?: number; token?: string }) => authController.request<PaymentVerification>("/api/payments/verify", "POST", input),
  search: (input: string, session_token: string) => authController.request<{ id: string; label: string }[]>("/api/places", "POST", { input, session_token }),
  address: (place_id: string, session_token: string) => authController.request<AddressInput>("/api/places", "POST", { place_id, session_token }),
};
export function deliveryId(value: string | string[] | undefined) {
  return typeof value === "string" && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
}
