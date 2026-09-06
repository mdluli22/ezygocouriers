"use client";

/**
 * Authentication changes affect server layouts and proxy decisions. A document
 * navigation guarantees the next request is made with the new cookie state and
 * prevents protected UI from lingering in the App Router cache.
 */
export function replaceAfterAuth(destination: string) {
  window.location.replace(destination);
}

export function safeInternalRedirect(candidate: string | null, fallback: string) {
  return candidate?.startsWith("/") && !candidate.startsWith("//")
    ? candidate
    : fallback;
}

export async function signOutSession() {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Unable to sign out");
  }
}

export async function signOutAndRedirect(destination: string) {
  await signOutSession();
  replaceAfterAuth(destination);
}
