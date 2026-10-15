/** Limit delivery history to the information each participant still needs. */
export function customerDeliveryPrivacy<T extends Record<string, unknown>>(delivery: T): T {
  if (delivery.status !== "delivered") return delivery;
  const result = { ...delivery };
  for (const key of Object.keys(result)) {
    if ((key.startsWith("driver_") && key !== "driver_name") || key === "assigned_driver_id") {
      Reflect.set(result, key, null);
    }
  }
  return result;
}

const driverHistoryFields = new Set([
  "id", "tracking_number", "status", "created_at", "updated_at", "completed_at",
  "distance_meters", "earning_cents", "estimated_earning_cents", "quote_amount", "quote_currency",
]);

export function driverDeliveryPrivacy<T extends Record<string, unknown>>(delivery: T): T {
  if (delivery.status !== "delivered") return delivery;
  const result = { ...delivery };
  // An allowlist prevents new customer fields from leaking into history later.
  for (const key of Object.keys(result)) {
    if (!driverHistoryFields.has(key)) Reflect.set(result, key, null);
  }
  return result;
}
