/** Native equivalents of the web landing page and customer portal colours. */
export const colors = {
  text: "#0f172a",
  ink: "#153836",
  primary: "#2f4f4f",
  accent: "#f59e0b",
  background: "#ffffff",
  surface: "#ffffff",
  muted: "#475569",
  border: "rgba(47, 79, 79, 0.12)",
  soft: "#f5f5f5",
  input: "#f5f5f5",
  success: "#087d58",
  danger: "#b42318",
  error: "#b6493f",
  heroText: "#c5d5cc",
  heroLabel: "#82ddb9",
  cream: "#fff4d9",
  pickup: "#fffaf0",
} as const;

/** Match the web portal’s DM Sans type while retaining native text scaling. */
export const fonts = {
  regular: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  semibold: "DMSans_600SemiBold",
  bold: "DMSans_700Bold",
} as const;
