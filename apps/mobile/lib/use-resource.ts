import { useAuth } from "./auth/provider";
import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { errorMessage } from "../components/auth/AuthUI";
export function useResource<T>(fetcher: () => Promise<T>) {
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
  useFocusEffect(useCallback(() => { if (phase !== "authenticated") return; void refresh(); return () => { generation.current++; }; }, [refresh, phase]));
  return { data, error, loading, refresh };
}
