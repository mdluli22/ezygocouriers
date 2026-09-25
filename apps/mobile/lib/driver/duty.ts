import type { DriverDuty } from "@ezygo/contracts";
import { secureStorage } from "../auth/storage";
import { authController } from "../auth/native-auth";
import { stopTracking } from "./location";
const key = "ezygo.driver.pending-off-duty";
export async function flushDuty(owner:number) {
  const pending = await secureStorage.read(key);
  if (pending !== String(owner)) return;
  await authController.request("/api/driver/duty","PATCH",{on_duty:false});
  await secureStorage.clear(key);
}
export async function dutyStatus():Promise<DriverDuty> {
  const owner = authController.getSnapshot().user?.id;
  if (owner) await flushDuty(owner);
  return authController.request<DriverDuty>("/api/driver/duty");
}
export async function setDuty(owner:number,on_duty:boolean) {
  if (!on_duty) { await secureStorage.write(key,String(owner)); await stopTracking(); }
  await authController.request("/api/driver/duty","PATCH",{on_duty});
  await secureStorage.clear(key);
}
