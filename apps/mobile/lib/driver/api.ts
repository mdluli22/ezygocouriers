import type { DriverDeliverySummary, DriverDeliveryDetail, DeliveryDetailResponse } from "@ezygo/contracts";
import { authController } from "../auth/native-auth";
export const driverApi = {
  list: () => authController.request<DriverDeliverySummary[]>("/api/driver/deliveries"),
  detail: (id: number) => authController.request<DeliveryDetailResponse<DriverDeliveryDetail>>(`/api/driver/deliveries/${id}`),
};
export const activeTrip = (status: string) => ["assigned", "picked_up", "in_transit"].includes(status);
