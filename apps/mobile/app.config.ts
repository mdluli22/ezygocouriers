import type { ExpoConfig, ConfigContext } from "expo/config";
export default ({config}:ConfigContext):ExpoConfig => ({
 ...config, name:config.name!,slug:config.slug!,
 extra:{...config.extra,...(process.env.EXPO_PUBLIC_EAS_PROJECT_ID ? {eas:{projectId:process.env.EXPO_PUBLIC_EAS_PROJECT_ID}}:{})},
 android:{...config.android,config:{...config.android?.config,...(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ? {googleMaps:{apiKey:process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}}:{})}},
});
