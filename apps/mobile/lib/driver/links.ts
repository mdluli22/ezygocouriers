export function contactUrl(phone: string, sms = false) {
  const clean = phone.replace(/[\s()-]/g, "");
  if (!/^\+?\d{7,15}$/.test(clean)) throw new Error("This contact number is unavailable.");
  return `${sms ? "sms" : "tel"}:${clean}`;
}
export function mapsUrl(address: string, platform: string) {
  const destination = encodeURIComponent(address);
  return platform === "ios" ? `https://maps.apple.com/?daddr=${destination}&dirflg=d` : `geo:0,0?q=${destination}`;
}
