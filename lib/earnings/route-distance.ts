import { query } from "@/lib/db/server";
/** Server-verified pickup-to-drop-off driving route, not straight-line or driver-to-pickup distance. */
export async function verifyRouteDistance(deliveryId: number): Promise<number | null> {
  const result = await query(`SELECT d.route_distance_meters,
    pa.latitude AS plat,pa.longitude AS plng,pa.formatted_address AS pickup,
    da.latitude AS dlat,da.longitude AS dlng,da.formatted_address AS dropoff
    FROM deliveries d JOIN addresses pa ON pa.id=d.pickup_address_id
    JOIN addresses da ON da.id=d.dropoff_address_id WHERE d.id=$1`,[deliveryId]);
  const row=result.rows[0];
  if (!row) return null;
  if(row.route_distance_meters !== null) return Number(row.route_distance_meters);
  const key=process.env.GOOGLE_ROUTES_API_KEY;
  if(!key) return null;
  function waypoint(lat: unknown,lng: unknown,address: string) {
    return lat !== null && lng !== null ? {location:{latLng:{latitude:Number(lat),longitude:Number(lng)}}} : {address};
  }
  try {
    const response=await fetch("https://routes.googleapis.com/directions/v2:computeRoutes",{
      method:"POST", headers:{"Content-Type":"application/json","X-Goog-Api-Key":key,"X-Goog-FieldMask":"routes.distanceMeters"},
      body:JSON.stringify({origin:waypoint(row.plat,row.plng,row.pickup),destination:waypoint(row.dlat,row.dlng,row.dropoff),travelMode:"DRIVE",routingPreference:"TRAFFIC_UNAWARE",computeAlternativeRoutes:false}),
      signal:AbortSignal.timeout(8000),cache:"no-store",
    });
    if(!response.ok) { console.warn("Route verification unavailable",{deliveryId,status:response.status}); return null; }
    const data=await response.json(); const meters=data.routes?.[0]?.distanceMeters;
    if(!Number.isSafeInteger(meters)||meters<0) return null;
    const saved=await query(`UPDATE deliveries SET route_distance_meters=COALESCE(route_distance_meters,$2),route_verified_at=COALESCE(route_verified_at,NOW()) WHERE id=$1 RETURNING route_distance_meters`,[deliveryId,meters]);
    return Number(saved.rows[0].route_distance_meters);
  } catch { console.warn("Route verification unavailable",{deliveryId}); return null; }
}
