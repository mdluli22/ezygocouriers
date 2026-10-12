"use client";

import Link from "next/link";

export default function RememberSession({ checked, onChange, disabled }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2 text-sm">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          name="rememberMe"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          disabled={disabled}
          aria-describedby="session-hint"
          className="h-4 w-4 accent-[var(--color-link)]"
        />
        Keep me signed in
      </label>
      <p id="session-hint" className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        Choose this only on a private device. We use essential cookies to keep
        your sign-in secure. <Link href="/legal/cookies" className="underline">Cookie policy</Link>
      </p>
    </div>
  );
}
