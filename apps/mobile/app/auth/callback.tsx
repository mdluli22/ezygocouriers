import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../lib/auth/provider";
import { googleFlow } from "../../lib/auth/native-auth";
import { Action, AuthPage, Notice, errorMessage } from "../../components/auth/AuthUI";
import { GOOGLE_RETURN_URL } from "../../lib/auth/links";

export default function GoogleCallback() {
  const auth = useAuth();
  const params = useLocalSearchParams<{ code?: string; state?: string; error?: string }>();
  const callbackParams = JSON.stringify(params);
  const [error, setError] = useState("");
  useEffect(() => {
    if (auth.phase === "loading" || auth.phase === "authenticated") return;
    let live = true;
    const url = new URL(GOOGLE_RETURN_URL);
    for (const [key, value] of Object.entries(JSON.parse(callbackParams) as Record<string, unknown>)) if (typeof value === "string") url.searchParams.set(key, value);
    void googleFlow.complete(url.toString()).catch(error => { if (live) setError(errorMessage(error)); });
    return () => { live = false; };
  }, [callbackParams, auth.phase]); // Scalar link fields; never persist router params.
  if (auth.phase === "authenticated") return <Redirect href="/" />;
  return <AuthPage title="Finishing sign-in" subtitle="Connecting your Google account securely.">
    {error ? <><Notice message={error} error /><Action label="Back to sign in" onPress={() => router.replace("/auth/sign-in")} /></> : <ActivityIndicator color="#173d38" />}
  </AuthPage>;
}
