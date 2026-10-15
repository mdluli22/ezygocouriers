import type { ExpoConfig, ConfigContext } from "expo/config";
import { existsSync } from "node:fs";

export default ({ config }: ConfigContext): ExpoConfig => {
  const personalTeam = process.env.EZYGO_IOS_PERSONAL_TEAM === "1";
  const production = process.env.EAS_BUILD_PROFILE === "production";
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() || config.extra?.eas?.projectId;
  const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  // EAS file environment variables resolve to a downloaded file on the builder.
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON || config.android?.googleServicesFile;
  if (production) {
    if (personalTeam) throw new Error("Store builds require paid Apple Developer signing; disable EZYGO_IOS_PERSONAL_TEAM.");
    if (!projectId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
      throw new Error("Set EXPO_PUBLIC_EAS_PROJECT_ID to the linked Expo project UUID in the production EAS environment.");
    }
    if (process.env.EAS_BUILD_PLATFORM === "android") {
      if (!mapsKey) throw new Error("Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in the production EAS environment.");
      if (!googleServicesFile || !existsSync(googleServicesFile)) {
        throw new Error("Set GOOGLE_SERVICES_JSON to the Firebase Android google-services.json file using an EAS file environment variable.");
      }
    }
  }
  return {
    ...config,
    name: config.name!,
    slug: config.slug!,
    // Expo composes mod callbacks inside-out: register this first to remove APNs last.
    plugins: [...(personalTeam ? ["./plugins/with-personal-team.cjs"] : []), ...(config.plugins ?? [])],
    extra: {
      ...config.extra,
      iosPersonalTeam: personalTeam,
      ...(projectId ? { eas: { ...config.extra?.eas, projectId } } : {}),
    },
    android: {
      ...config.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
      config: {
        ...config.android?.config,
        ...(mapsKey ? { googleMaps: { apiKey: mapsKey } } : {}),
      },
    },
  };
};
