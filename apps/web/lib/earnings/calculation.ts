/** EzyGo Rider Pay Per Delivery: amounts are integer cents, distance is metres. */
export const RIDER_RATE_VERSION = "rider-pay-v1";
export function deliveryPayCents(meters: number | null): number | null {
  if (meters === null || !Number.isSafeInteger(meters) || meters < 0) return null;
  const tiers = [[5000,3200],[10000,3500],[15000,3900],[20000,4400],[25000,5000],[30000,5700]];
  return tiers.find(([limit]) => meters <= limit)?.[1] ?? null;
}
/** Progressive bands, matching the PDF example: 275 deliveries = R304. */
export function monthlyBonusCents(count: number): number {
  if (!Number.isSafeInteger(count) || count < 0) throw new Error("Invalid delivery count");
  return Math.min(Math.max(count - 149,0),100)*200
    + Math.min(Math.max(count - 249,0),100)*400
    + Math.min(Math.max(count - 349,0),100)*600
    + Math.max(count - 449,0)*800;
}
const DAY = 86400000;
const SAST = 2 * 3600000;
export function localDate(now = new Date()): string { return new Date(now.getTime()+SAST).toISOString().slice(0,10); }
export function weekStart(now = new Date()): string {
  const local = new Date(`${localDate(now)}T00:00:00Z`);
  local.setUTCDate(local.getUTCDate() - (local.getUTCDay()+6)%7);
  return local.toISOString().slice(0,10);
}
export function shiftDate(date: string, days: number): string { return new Date(Date.parse(`${date}T00:00:00Z`)+days*DAY).toISOString().slice(0,10); }
export function weekPeriod(monday: string) {
  const date = new Date(`${monday}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(monday) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0,10)!==monday || date.getUTCDay() !== 1) throw new Error("Select a Monday");
  const payDate = shiftDate(monday,7);
  return { start: monday, end: shiftDate(monday,6), payDate, from: `${monday}T00:00:00+02:00`, until: `${payDate}T00:00:00+02:00` };
}
export function monthPeriod(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Invalid month");
  const next = new Date(`${month}-01T00:00:00Z`); next.setUTCMonth(next.getUTCMonth()+1);
  return { month, from:`${month}-01T00:00:00+02:00`, until:`${next.toISOString().slice(0,10)}T00:00:00+02:00` };
}
export function money(cents: number) { return new Intl.NumberFormat("en-ZA",{style:"currency",currency:"ZAR"}).format(cents/100); }
export function distanceLabel(meters: number | null) { return meters === null ? "Distance awaiting verification" : `${(Math.ceil(meters / 100) / 10).toFixed(1)} km`; }
