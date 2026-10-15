"use client";

import { useEffect, type ReactNode } from "react";

/** Follow the device preference, including changes while the app is open. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const preference = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      document.documentElement.classList.toggle("dark", preference.matches);
    };

    applyTheme();
    preference.addEventListener("change", applyTheme);
    return () => preference.removeEventListener("change", applyTheme);
  }, []);

  return <>{children}</>;
}
