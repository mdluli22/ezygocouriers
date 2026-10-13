"use client";

import { Search, X } from "lucide-react";
import { useRef, type RefObject } from "react";

export default function SearchField({ value, onChange, label, placeholder, inputRef, className = "" }: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  className?: string;
}) {
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? localRef;
  return (
    <div className={`search-field ${className}`} role="search">
      <Search size={20} aria-hidden="true" />
      <input ref={ref} type="search" value={value} onChange={event => onChange(event.target.value)} aria-label={label} placeholder={placeholder} autoCapitalize="none" autoComplete="off" spellCheck={false} />
      {value && <button type="button" aria-label={`Clear ${label.toLowerCase()}`} onClick={() => { onChange(""); ref.current?.focus(); }}><X size={18} /></button>}
    </div>
  );
}
