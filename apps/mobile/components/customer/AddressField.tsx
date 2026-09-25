import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import * as Crypto from "expo-crypto";
import type { AddressInput } from "@ezygo/contracts";
import { customerApi } from "../../lib/customer-api";
import { Action, Field, Notice, errorMessage } from "./UI";
export function AddressField({ label, value, onChange }: { label: string; value?: AddressInput; onChange: (value?: AddressInput) => void }) {
  const [query, setQuery] = useState(value?.formatted_address ?? "");
  const [suggestions, setSuggestions] = useState<{ id: string; label: string }[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const session = useRef(Crypto.randomUUID());
  const generation = useRef(0);
  useEffect(() => {
    const current = ++generation.current;
    if (value || query.trim().length < 3) { setSuggestions([]); setBusy(false); return; }
    const timer = setTimeout(async () => {
      setBusy(true); setError("");
      try { const found = await customerApi.search(query, session.current); if (generation.current === current) setSuggestions(found); }
      catch (e) { if (generation.current === current) setError(errorMessage(e)); }
      finally { if (generation.current === current) setBusy(false); }
    }, 350);
    return () => { clearTimeout(timer); generation.current++; };
  }, [query, value, retry]);
  async function select(id: string) {
    const current = ++generation.current;
    setBusy(true); setError("");
    try {
      const address = await customerApi.address(id, session.current);
      if (generation.current !== current) return;
      session.current = Crypto.randomUUID(); setQuery(address.formatted_address); setSuggestions([]); onChange(address);
    } catch (e) { if (generation.current === current) setError(errorMessage(e)); }
    finally { if (generation.current === current) setBusy(false); }
  }
  return <View style={{ gap: 10 }}><Field label={label} value={query} onChangeText={text => { generation.current++; setQuery(text); onChange(undefined); setError(""); }} autoCapitalize="words" />
    {busy ? <Notice message="Searching addresses…" /> : null}
    {error ? <><Notice message={error} error /><Action label="Retry address search" secondary onPress={() => setRetry(retry + 1)} /></> : null}
    {!value && query.length >= 3 && !busy && !error && suggestions.length === 0 ? <Notice message="Enter a street address and select a Cape Town result." /> : null}
    {suggestions.map(s => <Action key={s.id} label={s.label} secondary disabled={busy} onPress={() => void select(s.id)} />)}
    {suggestions.length ? <Text style={{ color: "#52665e", fontSize: 12 }}>Google Maps</Text> : null}
    {value ? <Notice message="Cape Town address selected" /> : null}
  </View>;
}
