import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Agent } from "node:https";

// Restrict server egress to known Web Push operators; never accept arbitrary URLs.
export function allowedPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && !url.username && !url.password && !url.hash && !url.port &&
      (host === "fcm.googleapis.com" || host === "updates.push.services.mozilla.com" ||
       host === "web.push.apple.com" || host.endsWith(".push.apple.com") ||
       host === "wns.windows.com" || host.endsWith(".notify.windows.com"));
  } catch { return false; }
}

export function publicAddress(address: string): boolean {
  // Resolve only IPv4 for push, simplifying mapped-address and private-range handling.
  if (isIP(address) !== 4) return false;
  const [a,b] = address.split(".").map(Number);
  return a > 0 && a !== 10 && a !== 127 && a < 224 &&
    !(a === 169 && b === 254) && !(a === 172 && b >= 16 && b <= 31) &&
    !(a === 192 && (b === 168 || b === 0)) && !(a === 100 && b >= 64 && b <= 127) &&
    !(a === 198 && (b === 18 || b === 19));
}

export async function resolvePushAddress(endpoint: string): Promise<string> {
  if (!allowedPushEndpoint(endpoint)) throw new Error("Unsupported push endpoint.");
  const addresses = await lookup(new URL(endpoint).hostname, { family: 4, all: true });
  if (!addresses.length || addresses.some(a => !publicAddress(a.address))) throw new Error("Unsafe push destination.");
  return addresses[0].address;
}

export function pinnedPushAgent(address: string): Agent {
  if (!publicAddress(address)) throw new Error("Unsafe push address.");
  return new Agent({ family: 4, lookup: (_hostname, options, callback) => {
    if (options.all) callback(null,[{address,family:4}]);
    else callback(null,address,4);
  } });
}
