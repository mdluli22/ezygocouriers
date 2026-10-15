"use client";

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";

/** Each update restarts the timer, including repeated identical messages. */
export function useTimedMessage<T>(initial: T, empty: T, duration = 8000): [T, Dispatch<SetStateAction<T>>] {
  const [entry, setEntry] = useState({ value: initial, revision: 0 });
  // Keep the reset value stable even when callers pass object literals.
  const [resetValue] = useState(() => empty);
  const setValue = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    setEntry(current => ({
      value: typeof next === "function" ? (next as (value: T) => T)(current.value) : next,
      revision: current.revision + 1,
    }));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setEntry(current => ({ ...current, value: resetValue }));
    }, duration);
    return () => window.clearTimeout(timer);
  }, [entry.revision, duration, resetValue]);

  return [entry.value, setValue];
}
