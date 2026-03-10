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
  const [initialized, setInitialized] = useState(false);

  // Initialise Autocomplete once the Places library is loaded
  useEffect(() => {
    if (!placesLib || !inputRef.current || initialized) return;

    autocompleteRef.current = new placesLib.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "za" }, // South Africa only
      fields: ["formatted_address", "geometry", "place_id"],
      types: ["geocode", "establishment"],
    });

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current!.getPlace();
      if (!place.geometry?.location) return;

      const result: PlaceResult = {
        address: place.formatted_address ?? inputRef.current!.value,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        placeId: place.place_id ?? "",
      };

      onChange(result.address);
      onPlaceSelect(result);
    });

    setInitialized(true);
  }, [placesLib, initialized, onChange, onPlaceSelect]);

  return (
    <div className={className} style={style}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete="off"
        style={inputStyle}
      />
    </div>
  );
}
