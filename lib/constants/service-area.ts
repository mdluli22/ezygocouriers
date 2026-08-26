export const CAPE_TOWN_SERVICE_BOUNDS = {
  north: -33.45,
  south: -34.37,
  west: 18.28,
  east: 19.16,
} as const;

interface ServiceAreaAddress {
  formatted_address: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Validate the operational Cape Town service area without trusting address
 * text alone. Google address results normally include "Cape Town" for suburbs;
 * the coordinate envelope rejects similarly named places elsewhere.
 */
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
