import { z } from "zod";
export const installationIdentitySchema = z.object({ installation_id: z.uuid(), installation_secret: z.string().regex(/^[a-f0-9]{64}$/) });
export const installationSchema = installationIdentitySchema.extend({ expo_token: z.string().regex(/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/).max(255), platform: z.enum(["ios", "android"]) });
export const driverDutySchema = z.object({ on_duty: z.boolean() });
export interface DriverDuty { on_duty: boolean }
export interface LiveDeliveryLocation {
  location: { latitude: number; longitude: number; recorded_at: string; accuracy: number | null; stale: boolean } | null;
  pickup: { latitude: number; longitude: number } | null;
  dropoff: { latitude: number; longitude: number } | null;
  server_time: string;
}
export const LIVE_LOCATION_MAX_AGE_MS = 300000;
export const LIVE_LOCATION_STALE_MS = 60000;
/** Capture cadence and upload cadence both slow while stationary. */
export function locationCadence(speed: number | null | undefined) { return speed != null && speed > 1 ? 15000 : 60000; }
export function distanceMetres(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const radians = (v: number) => v * Math.PI / 180;
  const value = Math.sin(radians(b.latitude-a.latitude)/2)**2 + Math.cos(radians(a.latitude))*Math.cos(radians(b.latitude))*Math.sin(radians(b.longitude-a.longitude)/2)**2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(Math.min(1,value)),Math.sqrt(Math.max(0,1-value)));
}
