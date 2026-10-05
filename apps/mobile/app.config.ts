import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const personalTeam = process.env.EZYGO_IOS_PERSONAL_TEAM === "1";
  return {
    ...config,
    name: config.name!,
    slug: config.slug!,
    // Expo composes mod callbacks inside-out: register this first to remove APNs last.
    plugins: [...(personalTeam ? ["./plugins/with-personal-team.cjs"] : []), ...(config.plugins ?? [])],
    extra: {
      ...config.extra,
      iosPersonalTeam: personalTeam,
      ...(process.env.EXPO_PUBLIC_EAS_PROJECT_ID ? { eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID } } : {}),
    },
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        ...(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ? { googleMaps: { apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY } } : {}),
      },
    },
  };
};
