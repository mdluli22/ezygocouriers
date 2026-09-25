import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as Crypto from "expo-crypto";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import { secureStorage } from "../auth/storage";
import { authController } from "../auth/native-auth";
import { mobileTransport } from "../api";
const key = "ezygo.installation";
const removalKey = "ezygo.notifications.pending-removal";
let registrationGeneration = 0;
let activeRegistration: Promise<void> = Promise.resolve();
const preference = "ezygo.notifications.enabled";
export const nativePushAvailable = Device.isDevice && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
async function identity() {
  const raw = await secureStorage.read(key);
  if (raw) return JSON.parse(raw) as { installation_id: string; installation_secret: string };
  const result = { installation_id: Crypto.randomUUID(), installation_secret: Array.from(await Crypto.getRandomBytesAsync(32), n => n.toString(16).padStart(2,"0")).join("") };
  await secureStorage.write(key,JSON.stringify(result)); return result;
}
export async function flushNotificationRemoval() {
  const raw = await secureStorage.read(removalKey);
  if (!raw) return;
  await mobileTransport("/api/mobile/v1/installations","DELETE",JSON.parse(raw));
  if (await secureStorage.read(removalKey) === raw) await secureStorage.clear(removalKey);
}
export async function unregisterNotifications() {
  registrationGeneration++;
  await secureStorage.clear(preference);
  await activeRegistration.catch(() => undefined);
  const raw = await secureStorage.read(key);
  if (raw) await secureStorage.write(removalKey,raw);
  await flushNotificationRemoval();
}
export function registerNotifications(prompt = false) {
  const generation = registrationGeneration;
  activeRegistration = activeRegistration.catch(() => undefined).then(() => register(prompt,generation));
  return activeRegistration;
}
async function register(prompt: boolean, generation:number) {
  await flushNotificationRemoval();

  if (!prompt && await secureStorage.read(preference) !== "true") return;
  if (!nativePushAvailable) { if (prompt) throw new Error("Push notifications require a development or release build on a physical device."); return; }
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("deliveries", { name: "Delivery updates", importance: Notifications.AndroidImportance.DEFAULT });
  let permission = await Notifications.getPermissionsAsync();
  if (prompt && !permission.granted) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error("Enable notifications in device settings to receive delivery updates.");
  const projectId = Constants.easConfig?.projectId ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) throw new Error("This build needs an EAS project ID before push can be enabled.");
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  if (generation !== registrationGeneration) return;
  await authController.request("/api/mobile/v1/installations","POST",{ ...await identity(), expo_token: token.data, platform: Platform.OS });
  if (generation === registrationGeneration) await secureStorage.write(preference,"true");
}
