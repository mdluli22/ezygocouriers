import { NextRequest } from "next/server";
import { z } from "zod";
import { addressSchema, CAPE_TOWN_SERVICE_BOUNDS as bounds } from "@ezygo/contracts";
import { getSession } from "@/lib/auth/session";
import { withApiRoute } from "@/lib/api/route";
import { parseJsonRequest } from "@/lib/api/validation";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api/response";

export const POST = withApiRoute("/api/places", async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  if (session.role !== "customer") return errorResponse("Access denied.", undefined, 403);
  const parsed = await parseJsonRequest(req, z.object({ input: z.string().trim().min(3).max(200).optional(), place_id: z.string().regex(/^[A-Za-z0-9_-]+$/).max(255).optional(), session_token: z.string().uuid() }));
  if (!parsed.success) return parsed.response;
  const { input, place_id, session_token } = parsed.data;
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return errorResponse("Address search is temporarily unavailable.", undefined, 503);
  const headers = { "Content-Type": "application/json", "X-Goog-Api-Key": key };
  if (place_id) {
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(place_id)}?sessionToken=${session_token}`, { headers: { ...headers, "X-Goog-FieldMask": "formattedAddress,addressComponents,location" }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) return errorResponse("Could not load this address. Search again.", undefined, 503);
    const place = await response.json() as { formattedAddress: string; location: { latitude: number; longitude: number }; addressComponents?: { longText: string; types: string[] }[] };
    const component = (type: string) => place.addressComponents?.find(c => c.types.includes(type))?.longText ?? "";
    const address = addressSchema.safeParse({ formatted_address: place.formattedAddress, street_address: [component("street_number"), component("route")].filter(Boolean).join(" ") || place.formattedAddress, city: component("locality"), suburb: component("sublocality_level_1"), province: component("administrative_area_level_1"), postal_code: component("postal_code"), country: component("country"), ...place.location });
    if (!address.success) return errorResponse("This address is outside our Cape Town delivery area.");
    return successResponse("Address selected.", address.data);
  }
  if (!input) return errorResponse("Enter an address.");
  const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", { method: "POST", headers, signal: AbortSignal.timeout(10000), body: JSON.stringify({ input, sessionToken: session_token, includedRegionCodes: ["za"], locationRestriction: { rectangle: { low: { latitude: bounds.south, longitude: bounds.west }, high: { latitude: bounds.north, longitude: bounds.east } } } }) });
  if (!response.ok) return errorResponse("Address search is temporarily unavailable. Try again.", undefined, 503);
  const result = await response.json() as { suggestions?: { placePrediction?: { placeId: string; text: { text: string } } }[] };
  return successResponse("Addresses found.", (result.suggestions ?? []).flatMap(s => s.placePrediction ? [{ id: s.placePrediction.placeId, label: s.placePrediction.text.text }] : []));
});
