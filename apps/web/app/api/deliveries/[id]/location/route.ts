import { NextRequest } from "next/server";
import { deliveryIdParamSchema, type LiveDeliveryLocation } from "@ezygo/contracts";
import { getSession } from "@/lib/auth/session";
import { query } from "@/lib/db/server";
import { withApiRoute } from "@/lib/api/route";
import { successResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/api/response";
export const GET = withApiRoute("/api/deliveries/[id]/location", async (_req: NextRequest, {params}: {params:Promise<{id:string}>}) => {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  if (session.role !== "customer") return forbiddenResponse();
  const id = deliveryIdParamSchema.safeParse((await params).id);
  if (!id.success) return notFoundResponse();
  // The CASE expression prevents coordinates leaving the database when sharing is not permitted.
  const result = await query<{point: LiveDeliveryLocation['location']; pickup: LiveDeliveryLocation['pickup']; dropoff: LiveDeliveryLocation['dropoff']; server_time: string}>(`SELECT
    CASE WHEN d.status IN ('assigned','picked_up','in_transit') AND dr.status='active' AND dr.on_duty
      AND dr.location_delivery_id=d.id AND s.user_id=dr.user_id AND s.expires_at>NOW() AND u.is_active AND u.email_verified
      AND dr.location_updated_at>NOW()-INTERVAL '5 minutes'
      THEN json_build_object('latitude',dr.current_latitude::float,'longitude',dr.current_longitude::float,
        'recorded_at',dr.location_updated_at,'accuracy',dr.location_accuracy,'stale',dr.location_updated_at<NOW()-INTERVAL '60 seconds')
      ELSE NULL END AS point,
    CASE WHEN pa.latitude IS NOT NULL AND pa.longitude IS NOT NULL THEN json_build_object('latitude',pa.latitude::float,'longitude',pa.longitude::float) END AS pickup,
    CASE WHEN da.latitude IS NOT NULL AND da.longitude IS NOT NULL THEN json_build_object('latitude',da.latitude::float,'longitude',da.longitude::float) END AS dropoff,
    NOW() AS server_time
    FROM deliveries d JOIN addresses pa ON pa.id=d.pickup_address_id JOIN addresses da ON da.id=d.dropoff_address_id
    LEFT JOIN drivers dr ON dr.id=d.assigned_driver_id LEFT JOIN users u ON u.id=dr.user_id
    LEFT JOIN auth_sessions s ON s.id=dr.location_session_id
    WHERE d.id=$1 AND d.customer_id=$2`,[id.data,session.userId]);
  const row=result.rows[0];
  if (!row) return notFoundResponse();
  return successResponse("Live location.",{location:row.point,pickup:row.pickup,dropoff:row.dropoff,server_time:row.server_time});
});
