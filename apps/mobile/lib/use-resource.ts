import { useAuth } from "./auth/provider";
import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { AppState } from "react-native";
import { errorMessage } from "../components/auth/AuthUI";
export function useResource<T>(fetcher: () => Promise<T>, refreshInterval = 0) {
  const { phase } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true); setError("");
    try { const result = await fetcher(); if (current === generation.current) setData(result); }
    catch (e) { if (current === generation.current) setError(errorMessage(e)); }
    finally { if (current === generation.current) setLoading(false); }
  }, [fetcher]);
  useFocusEffect(useCallback(() => {
    if (phase !== "authenticated") return;
    let active = true;
    let pending = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function update() {
      if (!active || pending || AppState.currentState !== "active") return;
      pending = true;
      clearTimeout(timer);
      try { await refresh(); }
      finally {
        pending = false;
        if (active && refreshInterval > 0 && AppState.currentState === "active") {
          timer = setTimeout(() => void update(), refreshInterval);
        }
      }
    }
    void update();
    const listener = AppState.addEventListener("change", state => {
      clearTimeout(timer);
      if (state === "active") void update();
    });
    return () => { active = false; generation.current++; clearTimeout(timer); listener.remove(); };
  }, [refresh, phase, refreshInterval]));
  return { data, error, loading, refresh };
}
