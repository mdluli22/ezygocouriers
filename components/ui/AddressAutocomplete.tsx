"use client";

import { useEffect, useRef, useState } from "react";
import { CAPE_TOWN_SERVICE_BOUNDS } from "@/lib/constants/service-area";

export interface PlaceResult {
  address: string;
  lat: number;
  lng: number;
  placeId: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: PlaceResult) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  onFocus,
  onBlur,
  placeholder = "Search address…",
  className,
  style,
  inputStyle,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [ready, setReady] = useState(false);

  const borderParts = (() => {
    const b =
      (inputStyle?.border as string | undefined) ??
      "1.5px solid var(--color-border)";
    const parts = b.trim().split(/\s+/);
    return { width: parts[0] ?? "1.5px", style: parts[1] ?? "solid" };
  })();

  const computedBorder = isFocused
    ? `${borderParts.width} ${borderParts.style} var(--color-primary)`
    : (inputStyle?.border as string | undefined) ??
      "1.5px solid var(--color-border)";

  const computedShadow = isFocused
    ? "0 0 0 3px var(--color-primary-alpha)"
    : (inputStyle?.boxShadow as string | undefined) ?? "none";

  useEffect(() => {
    if (!window.google?.maps?.places || !inputRef.current || autocompleteRef.current) {
      return;
    }

    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "za" },
      bounds: CAPE_TOWN_SERVICE_BOUNDS,
      strictBounds: true,
      fields: ["formatted_address", "geometry", "place_id", "name"],
    });

    autocompleteRef.current = ac;
    const readyTimer = window.setTimeout(() => setReady(true), 0);

    const listener = ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      if (!place.geometry?.location) return;

      const address =
        place.formatted_address ??
        place.name ??
        inputRef.current?.value ??
        "";

      onChange(address);
      onPlaceSelect({
        address,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        placeId: place.place_id ?? "",
      });
    });

    return () => {
      window.clearTimeout(readyTimer);
      listener.remove();
      autocompleteRef.current = null;
      setReady(false);
    };
  }, [onChange, onPlaceSelect]);

  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  return (
    <div className={className} style={{ position: "relative", ...style }}>
      <input
        ref={inputRef}
        type="text"
        defaultValue={value}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        onInput={(e) => onChange((e.target as HTMLInputElement).value)}
        onFocus={() => {
          setIsFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          setIsFocused(false);
          onBlur?.();
        }}
        style={{
          width: "100%",
          boxSizing: "border-box",
          outline: "none",
          ...inputStyle,
          border: computedBorder,
          boxShadow: computedShadow,
          opacity: ready ? 1 : 0.7,
        }}
      />
      {!ready && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            right: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "14px",
            height: "14px",
            borderRadius: "50%",
            border: "2px solid var(--color-border)",
            borderTopColor: "var(--color-primary)",
            animation: "spin 0.7s linear infinite",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
