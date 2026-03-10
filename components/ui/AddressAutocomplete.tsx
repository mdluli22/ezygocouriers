"use client";

import { useEffect, useRef, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

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
  const placesLib = useMapsLibrary("places");
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Extract border-width and border-style from the `border` shorthand so we can
  // rebuild it with a different colour on focus — without ever mixing the
  // `border` shorthand and the `borderColor` longhand (which causes React to
  // drop one of them during re-renders).
  const borderWidthStyle = (() => {
    const b = inputStyle?.border as string | undefined;
    if (!b) return { width: "1px", style: "solid" };
    const parts = b.trim().split(/\s+/);
    // shorthand order: width style color  (some parts may be absent)
    return {
      width: parts[0] ?? "1px",
      style: parts[1] ?? "solid",
    };
  })();

  // Initialise the legacy Autocomplete widget once the Places library is loaded.
  // This uses google.maps.places.Autocomplete (not PlaceAutocompleteElement)
  // so it works with the standard Places API — no "Places API (New)" needed.
  useEffect(() => {
    if (!placesLib || !inputRef.current || autocompleteRef.current) return;

    const ac = new placesLib.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "za" },
      types: ["geocode", "establishment"],
      fields: ["formatted_address", "geometry", "place_id", "name"],
    });

    autocompleteRef.current = ac;

    // When the user picks a suggestion from the dropdown
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      if (!place.geometry?.location) return;

      const address =
        place.formatted_address ?? place.name ?? inputRef.current?.value ?? "";
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const placeId = place.place_id ?? "";

      onChange(address);
      onPlaceSelect({ address, lat, lng, placeId });
    });

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placesLib]);

  // Keep the input value in sync when the parent changes it externally
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
          // On focus, replace the entire `border` shorthand so we never mix
          // `border` (shorthand) and `borderColor` (longhand) in the same style
          // object — React drops one of them during re-renders when both are set.
          border: isFocused
            ? `${borderWidthStyle.width} ${borderWidthStyle.style} var(--color-primary)`
            : (inputStyle?.border as string | undefined) ?? "1px solid var(--color-border)",
          boxShadow: isFocused
            ? "0 0 0 3px var(--color-primary-alpha)"
            : (inputStyle?.boxShadow as string | undefined) ?? "none",
        }}
      />
    </div>
  );
}
