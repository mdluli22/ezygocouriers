import { locationCadence, type DriverDuty } from "@ezygo/contracts";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { AppState } from "react-native";
import { ApiError } from "@ezygo/api-client";
import type { DriverLocationInput, MobileSessionData } from "@ezygo/contracts";
import { authController } from "../auth/native-auth";
import { secureStorage, sessionStore } from "../auth/storage";
import { mobileTransport } from "../api";
import { driverOutbox, isDriver } from "./queue";

const task = "ezygo.driver.trip-location.v1";
const consentKey = "ezygo.driver.tracking-consent";
const pendingStopKey = "ezygo.driver.pending-location-stop";
const backgroundPointKey = "ezygo.driver.background-point";
interface Consent { owner: number; trip: number; background: boolean; expires: number }
let watcher: Location.LocationSubscription | null = null;
let generation = 0;
let lastCapture = 0;
export const backgroundAvailable = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
export async function trackingConsent(): Promise<Consent | null> {
  const raw = await secureStorage.read(consentKey);
  if (!raw) return null;
  const value: Consent = JSON.parse(raw);
  return value.expires > Date.now() ? value : null;
}
function point(location: Location.LocationObject, trip: number): DriverLocationInput | null {
  if (location.coords.accuracy === null || location.coords.accuracy > 100 || Date.now() - location.timestamp > 60000 || location.timestamp > Date.now() + 10000) return null;
  return { delivery_id: trip, latitude: location.coords.latitude, longitude: location.coords.longitude, accuracy: location.coords.accuracy, recorded_at: new Date(location.timestamp).toISOString() };
}
export async function stopTracking() {
  generation++; watcher?.remove(); watcher = null;
  const raw = await secureStorage.read(consentKey);
  if (raw) await secureStorage.write(pendingStopKey, JSON.stringify({ owner: (JSON.parse(raw) as Consent).owner, stopped_at: new Date().toISOString() }));
  await secureStorage.clear(consentKey);
  await secureStorage.clear(backgroundPointKey);
  if (raw) await driverOutbox.clearLocation((JSON.parse(raw) as Consent).owner);
  if (backgroundAvailable && await Location.hasStartedLocationUpdatesAsync(task)) await Location.stopLocationUpdatesAsync(task);
}
export async function flushTrackingStop(owner: number) {
  const raw = await secureStorage.read(pendingStopKey);
  if (!raw || !isDriver(owner)) return;
  const pending = JSON.parse(raw) as { owner: number; stopped_at: string };
  if (pending.owner !== owner) { await secureStorage.clear(pendingStopKey); return; }
  await authController.request("/api/driver/location", "DELETE", { stopped_at: pending.stopped_at });
  if (await secureStorage.read(pendingStopKey) === raw) await secureStorage.clear(pendingStopKey);
}
export async function startTracking(owner: number, trip: number, background = false) {
  if (!isDriver(owner)) throw new Error("Verify your driver session before sharing location.");
  if (await secureStorage.read("ezygo.driver.pending-off-duty") === String(owner)) throw new Error("Sync your duty status before sharing location.");
  if (background && !backgroundAvailable) throw new Error("Background tracking requires a native EzyGo development build.");
  if (!(await authController.request<DriverDuty>("/api/driver/duty")).on_duty) throw new Error("Go on duty before sharing location.");
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted") throw new Error("Location permission was denied. Trip status updates remain available.");
  if (background) {
    const permission = await Location.requestBackgroundPermissionsAsync();
    if (permission.status !== "granted") throw new Error("Background permission was not granted. You can use foreground sharing.");
  }
  if (!isDriver(owner)) throw new Error("Your session changed while requesting permission.");
  await stopTracking();
  const run = generation;
  const consent: Consent = { owner, trip, background, expires: Date.now() + 12 * 60 * 60 * 1000 };
  await secureStorage.write(consentKey, JSON.stringify(consent));
  try {
    if (background) {
      await Location.startLocationUpdatesAsync(task, {
        accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 25,
        deferredUpdatesInterval: 60000, pausesUpdatesAutomatically: true,
        showsBackgroundLocationIndicator: true,
        foregroundService: { notificationTitle: "EzyGo trip location", notificationBody: "Sharing location for your active trip. Stop sharing in EzyGo.", killServiceOnDestroy: true },
      });
    } else {
      watcher = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 25 }, location => {
        if (run !== generation || AppState.currentState !== "active" || !isDriver(owner) || Date.now() >= consent.expires || Date.now() - lastCapture < locationCadence(location.coords.speed)) return;
        const value = point(location, trip); if (!value) return;
        lastCapture = Date.now();
        void driverOutbox.location(owner, value).then(() => driverOutbox.flush(owner)).catch(() => undefined);
      });
      if (run !== generation) { watcher.remove(); watcher = null; }
    }
  } catch (error) { await stopTracking(); throw error; }
}
export async function checkTracking(owner: number) {
  const consent = await trackingConsent();
  if (!consent || consent.owner !== owner || (await Location.getForegroundPermissionsAsync()).status !== "granted" || (!consent.background && !watcher)) {
    await stopTracking(); return null;
  }
  if (consent.background && (!(await Location.hasStartedLocationUpdatesAsync(task)) || (await Location.getBackgroundPermissionsAsync()).status !== "granted")) {
    await stopTracking(); return null;
  }
  return consent;
}
export async function recoverBackgroundPoint(owner: number) {
  const raw = await secureStorage.read(backgroundPointKey);
  if (!raw) return;
  const pending = JSON.parse(raw) as { owner: number; point: DriverLocationInput };
  const consent = await trackingConsent();
  if (pending.owner === owner && consent?.owner === owner && consent.trip === pending.point.delivery_id) await driverOutbox.location(owner, pending.point);
  await secureStorage.clear(backgroundPointKey);
}
// Defined at module scope so a native location wakeup can invoke this without UI.
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(task, async ({ data, error }) => {
  try {
    const consent = await trackingConsent();
    const saved = await sessionStore.read();
    if (error || !consent?.background || !saved) { await stopTracking(); return; }
    const newest = data?.locations?.reduce<Location.LocationObject | null>((latest, current) => !latest || current.timestamp > latest.timestamp ? current : latest, null);
    const value = newest ? point(newest, consent.trip) : null;
    if (!value) return;
    const previousRaw = await secureStorage.read(backgroundPointKey);
    const previous = previousRaw ? JSON.parse(previousRaw) as { owner: number; due?: number } : null;
    if (previous?.owner === consent.owner && (previous.due ?? 0) > Date.now()) {
      await secureStorage.write(backgroundPointKey, JSON.stringify({ owner: consent.owner, point: value, due: previous.due }));
      return;
    }
    try {
      const session = await mobileTransport<MobileSessionData>("/api/mobile/v1/auth/session", "GET", undefined, saved.accessToken);
      if (session.user.role !== "driver" || session.user.id !== consent.owner) { await stopTracking(); return; }
      const current = await trackingConsent();
      if (current?.owner !== consent.owner || current.trip !== consent.trip || (await sessionStore.read())?.accessToken !== saved.accessToken) return;
      await mobileTransport("/api/driver/location", "PATCH", value, saved.accessToken);
      await secureStorage.clear(backgroundPointKey);
    } catch (failure) {
      if (failure instanceof ApiError && [400, 401, 403, 404, 409].includes(failure.status)) { await stopTracking(); return; }
      const current = await trackingConsent();
      if (current?.owner === consent.owner && current.trip === consent.trip) await secureStorage.write(backgroundPointKey, JSON.stringify({ owner: consent.owner, point: value, due: Date.now() + Math.max(failure instanceof ApiError ? (failure.retryAfter ?? 0) * 1000 : 0, 15000) }));
    }
  } catch { /* Never leak coordinates or credentials to logs from a headless task. */ }
});
