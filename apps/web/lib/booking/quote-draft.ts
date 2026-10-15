import type { PlaceResult } from "@/components/ui/AddressAutocomplete";

export const BOOKING_DRAFT_KEY = "ezygo-booking-draft";

// Match the booking form's draft so both selected locations survive authentication.
export function createQuoteDraft(pickup: PlaceResult, dropoff: PlaceResult, savedAt = Date.now()) {
  const address = (place: PlaceResult) => ({
    formatted_address: place.address,
    street_address: place.address,
    city: "",
    province: "",
    postal_code: "",
    country: "South Africa",
    latitude: place.lat,
    longitude: place.lng,
  });
  return {
    savedAt,
    step: 1 as const,
    pickupText: pickup.address,
    dropoffText: dropoff.address,
    pickupGeo: address(pickup),
    dropoffGeo: address(dropoff),
  };
}
