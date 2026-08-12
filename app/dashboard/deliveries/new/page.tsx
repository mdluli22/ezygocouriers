"use client";

import { useState, useEffect, useRef } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import AddressAutocomplete, { PlaceResult } from "@/components/ui/AddressAutocomplete";

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: number;
  full_name: string;
  email: string;
}

type Step = 1 | 2 | 3;
type MeetingDropoff = "curb" | "meet" | "leave";
type AuthTab = "login" | "signup";

interface AddressGeo {
  formatted_address: string;
  street_address: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  latitude: number;
  longitude: number;
}

// ─── Auth Bottom Sheet Modal ──────────────────────────────────────────────────

function AuthModal({ onSuccess, onClose }: { onSuccess: (user: User) => void; onClose: () => void }) {
  const [tab, setTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Login failed."); return; }
      const me = await (await fetch("/api/auth/me")).json();
      if (me.success) onSuccess({ id: me.data.id, full_name: me.data.full_name, email: me.data.email });
    } catch { setError("Something went wrong."); }
    finally { setLoading(false); }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          confirm_password: password,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Signup failed."); return; }
      window.location.assign(
        `/auth/verify-email?email=${encodeURIComponent(data.data?.email || email)}`
      );
    } catch { setError("Something went wrong."); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-6"
        style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="w-10 h-1 rounded-full mx-auto mb-5 sm:hidden" style={{ backgroundColor: "var(--color-border)" }} />

        <h2 className="text-lg font-black mb-1" style={{ color: "var(--color-primary)" }}>
          {tab === "login" ? "Welcome back" : "Create account"}
        </h2>
        <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>
          {tab === "login" ? "Sign in to confirm your delivery." : "Quick signup — takes 30 seconds."}
        </p>

        {/* Tab toggle */}
        <div className="flex gap-2 mb-4">
          {(["login", "signup"] as AuthTab[]).map((t) => (
            <button key={t} type="button" onClick={() => { setTab(t); setError(""); }}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
              style={tab === t
                ? { backgroundColor: "var(--color-primary)", color: "#fff" }
                : { backgroundColor: "var(--color-surface)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }
              }
            >
              {t === "login" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-3 rounded-xl text-sm mb-3" style={{ backgroundColor: "rgb(239 68 68 / 0.1)", color: "var(--color-error)" }}>{error}</div>
        )}

        <form onSubmit={tab === "login" ? handleLogin : handleSignup} className="space-y-3">
          {tab === "signup" && (
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className="input" required autoComplete="name" />
          )}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="input" required autoComplete="email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="input" required autoComplete={tab === "login" ? "current-password" : "new-password"} />
          <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2 text-base">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                {tab === "login" ? "Signing in…" : "Creating account…"}
              </span>
            ) : tab === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Step dots ────────────────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i + 1 === current ? "24px" : "8px",
            height: "8px",
            backgroundColor: i + 1 <= current ? "var(--color-primary)" : "var(--color-border)",
          }}
        />
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NewDeliveryPage() {
  const [step, setStep] = useState<Step>(1);
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  // Addresses
  const [pickupText, setPickupText] = useState("");
  const [dropoffText, setDropoffText] = useState("");
  const [pickupGeo, setPickupGeo] = useState<AddressGeo | null>(null);
  const [dropoffGeo, setDropoffGeo] = useState<AddressGeo | null>(null);

  // Contact & parcel
  const [pickupContactName, setPickupContactName] = useState("");
  const [pickupPhone, setPickupPhone] = useState("");
  const [pickupNote, setPickupNote] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [dropoffNote, setDropoffNote] = useState("");
  const [parcelDescription, setParcelDescription] = useState("");
  const [packageType, setPackageType] = useState("small");
  const [fragile, setFragile] = useState(false);
  const [requirePin, setRequirePin] = useState(false);
  const [dropoffMeeting, setDropoffMeeting] = useState<MeetingDropoff>("curb");

  // Submission
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // PayFast
  const payfastFormRef = useRef<HTMLFormElement>(null);
  const [payfastData, setPayfastData] = useState<Record<string, string> | null>(null);
  const [payfastUrl, setPayfastUrl] = useState("");

  const isProcessing = loading || Boolean(payfastData);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.success) {
        const u = { id: d.data.id, full_name: d.data.full_name, email: d.data.email };
        setUser(u);
        setPickupContactName(prev => prev || d.data.full_name);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (payfastData && payfastFormRef.current) {
      payfastFormRef.current.submit();
    }
  }, [payfastData]);

  function handlePickupSelect(place: PlaceResult) {
    setPickupText(place.address);
    setPickupGeo({ formatted_address: place.address, street_address: place.address, city: "", province: "", postal_code: "", country: "South Africa", latitude: place.lat, longitude: place.lng });
    setFieldErrors(p => { const n = { ...p }; delete n["pickup_address.formatted_address"]; return n; });
  }

  function handleDropoffSelect(place: PlaceResult) {
    setDropoffText(place.address);
    setDropoffGeo({ formatted_address: place.address, street_address: place.address, city: "", province: "", postal_code: "", country: "South Africa", latitude: place.lat, longitude: place.lng });
    setFieldErrors(p => { const n = { ...p }; delete n["dropoff_address.formatted_address"]; return n; });
  }

  function mapDropoffMeeting(opt: MeetingDropoff): "meet_at_curb" | "meet_at_door" | "leave_at_door" {
    if (opt === "curb") return "meet_at_curb";
    if (opt === "leave") return "leave_at_door";
    return "meet_at_door";
  }

  function goToStep2() {
    const errs: Record<string, string> = {};
    if (!pickupGeo) errs["pickup_address.formatted_address"] = "Please select a pickup address";
    if (!dropoffGeo) errs["dropoff_address.formatted_address"] = "Please select a dropoff address";
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToStep3() {
    const errs: Record<string, string> = {};
    if (!parcelDescription.trim()) 
      errs["parcel_description"] = "Please select what you're sending";
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    if (!user) { setShowAuth(true); return; }
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function doSubmit() {
    if (!user) { setShowAuth(true); return; }
    setLoading(true); setError(""); setFieldErrors({});

    const body = {
      pickup_address: { ...pickupGeo, building_or_business: "", apt_suite: "", meeting_option: "meet_at_curb", notes: pickupNote },
      pickup_contact_name: pickupContactName || user.full_name,
      pickup_contact_phone: pickupPhone,
      dropoff_address: { ...dropoffGeo, building_or_business: "", apt_suite: "", meeting_option: mapDropoffMeeting(dropoffMeeting), notes: dropoffNote },
      recipient_name: recipientName,
      recipient_phone: recipientPhone,
      parcel_description: parcelDescription,
      package_type: packageType,
      fragile,
      require_pin: requirePin,
    };

    try {
      const res = await fetch("/api/deliveries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setFieldErrors(data.errors);
        else setError(data.message || "Failed to create delivery.");
        return;
      }
      setPayfastUrl(data.data.payfast.url);
      setPayfastData(data.data.payfast.form_data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleAuthSuccess(loggedInUser: User) {
    void loggedInUser;
    window.location.assign("/dashboard");
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!} libraries={["places"]} version="weekly">

      {/* Hidden PayFast form */}
      {payfastData && (
        <form ref={payfastFormRef} method="POST" action={payfastUrl} style={{ display: "none" }}>
          {Object.entries(payfastData).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        </form>
      )}

      {/* Auth bottom-sheet modal */}
      {showAuth && <AuthModal onSuccess={handleAuthSuccess} onClose={() => setShowAuth(false)} />}

      <div className="max-w-lg mx-auto px-0 sm:px-4 pb-32">

        {/* Page header */}
        <div className="mb-4">
          <h1 className="text-2xl font-black" style={{ color: "var(--color-primary)" }}>
            {step === 1 ? "Where to?" : step === 2 ? "Parcel details" : "Confirm & pay"}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {step === 1 ? "Enter pickup and dropoff addresses" : step === 2 ? "Tell us about what you're sending" : "Review your order below"}
          </p>
        </div>

        <StepDots current={step} total={3} />

        {/* ── STEP 1 – Addresses ────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Address input card */}
            <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              {/* Pickup row */}
              <div>
                <label className="flex items-center gap-2 mb-1.5">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: "var(--color-primary)" }} />
                  <span className="text-[11px] font-bold tracking-widest" style={{ color: "var(--color-text-muted)" }}>PICKUP</span>
                </label>
                <AddressAutocomplete
                  value={pickupText}
                  onChange={setPickupText}
                  onPlaceSelect={handlePickupSelect}
                  placeholder="Search pickup address…"
                  className="w-full"
                  inputStyle={{
                    width: "100%", padding: "10px 14px", fontSize: "15px", fontWeight: 500, outline: "none",
                    border: `1.5px solid ${fieldErrors["pickup_address.formatted_address"] ? "var(--color-error)" : "var(--color-border)"}`,
                    borderRadius: "10px",
                    backgroundColor: "var(--color-bg)", color: "var(--color-text-primary)",
                    transition: "border-color 0.15s ease",
                  }}
                />
                {fieldErrors["pickup_address.formatted_address"] && (
                  <p className="error-text mt-1">{fieldErrors["pickup_address.formatted_address"]}</p>
                )}
              </div>

              {/* Dropoff row */}
              <div>
                <label className="flex items-center gap-2 mb-1.5">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ border: "2.5px solid var(--color-primary)" }} />
                  <span className="text-[11px] font-bold tracking-widest" style={{ color: "var(--color-text-muted)" }}>DROPOFF</span>
                </label>
                <AddressAutocomplete
                  value={dropoffText}
                  onChange={setDropoffText}
                  onPlaceSelect={handleDropoffSelect}
                  placeholder="Search dropoff address…"
                  className="w-full"
                  inputStyle={{
                    width: "100%", padding: "10px 14px", fontSize: "15px", fontWeight: 500, outline: "none",
                    border: `1.5px solid ${fieldErrors["dropoff_address.formatted_address"] ? "var(--color-error)" : "var(--color-border)"}`,
                    borderRadius: "10px",
                    backgroundColor: "var(--color-bg)", color: "var(--color-text-primary)",
                    transition: "border-color 0.15s ease",
                  }}
                />
                {fieldErrors["dropoff_address.formatted_address"] && (
                  <p className="error-text mt-1">{fieldErrors["dropoff_address.formatted_address"]}</p>
                )}
              </div>
            </div>

            {/* Price pill */}
            <div className="flex items-center justify-between px-5 py-3.5 rounded-2xl" style={{ backgroundColor: "var(--color-primary)" }}>
              <div>
                <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.65)" }}>Flat delivery fee · No hidden costs</p>
              </div>
              <span className="text-2xl font-black text-white">R99</span>
            </div>

            <button type="button" onClick={goToStep2} className="btn-primary w-full py-4 text-base font-bold rounded-2xl">
              Continue →
            </button>
          </div>
        )}

        {/* ── STEP 2 – Parcel & Contacts ────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Route summary chip */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="shrink-0 w-2 h-2 rounded-full inline-block" style={{ backgroundColor: "var(--color-primary)" }} />
                  <span className="truncate font-medium" style={{ color: "var(--color-text-primary)" }}>{pickupText}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="shrink-0 w-2 h-2 rounded-sm inline-block" style={{ border: "1.5px solid var(--color-primary)" }} />
                  <span className="truncate font-medium" style={{ color: "var(--color-text-primary)" }}>{dropoffText}</span>
                </div>
              </div>
              <button type="button" onClick={() => setStep(1)} className="text-xs font-bold shrink-0 px-3 py-1.5 rounded-lg" style={{ backgroundColor: "var(--color-bg)", color: "var(--color-primary)", border: "1px solid var(--color-border)" }}>
                Edit
              </button>
            </div>

            {/* What are you sending */}
            <div className="rounded-2xl p-4 space-y-4" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <h3 className="font-black text-sm" style={{ color: "var(--color-primary)" }}>What are you sending?</h3>
              <select
                value={parcelDescription}
                onChange={(e) => {
                  setParcelDescription(e.target.value);

                  if (e.target.value) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.parcel_description;
                      return next;
                    });
                  }
                }}
                className={`input ${fieldErrors.parcel_description ? "input-error" : ""}`}
              >
                <option value="">Select what you&apos;re sending</option>
                <option value="Documents">Documents</option>
                <option value="Clothing">Clothing</option>
                <option value="Electronics">Electronics</option>
                <option value="Food">Food</option>
                <option value="Groceries">Groceries</option>
                <option value="Flowers">Flowers</option>
                <option value="Gifts">Gifts</option>
                <option value="Medical items">Medical items</option>
                <option value="Business supplies">Business supplies</option>
                <option value="Other">Other</option>
              </select>
              {fieldErrors.parcel_description && <p className="error-text">{fieldErrors.parcel_description}</p>}

              {/* Package size */}
              <div>
                <p className="text-[11px] font-bold tracking-widest mb-2" style={{ color: "var(--color-text-muted)" }}>PACKAGE SIZE</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "small", label: "Small", sub: "≤ 5 kg"},
                    { value: "medium", label: "Medium", sub: "≤ 15 kg"},
                    { value: "large", label: "Large", sub: "≤ 30 kg"},
                  ].map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setPackageType(opt.value)}
                      className="flex flex-col items-center gap-0.5 p-3 rounded-xl text-xs font-semibold transition-all"
                      style={
                        packageType === opt.value
                          ? { backgroundColor: "var(--color-primary)", color: "#fff", border: "2px solid var(--color-primary)" }
                          : { backgroundColor: "var(--color-bg)", color: "var(--color-text-primary)", border: "2px solid var(--color-border)" }
                      }
                    >
                      {/* <span className="text-xl">{opt.icon}</span> */}
                      <span>{opt.label}</span>
                      <span style={{ opacity: 0.6, fontWeight: 400 }}>{opt.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2">
                {[
                  { key: "fragile", checked: fragile, toggle: () => setFragile(v => !v), label: "Fragile", sub: "Handle with care" },
                  { key: "pin", checked: requirePin, toggle: () => setRequirePin(v => !v), label: "Require PIN", sub: "Recipient confirms with a PIN" },
                ].map((t) => (
                  <div key={t.key} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{t.label}</p>
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{t.sub}</p>
                    </div>
                    <button type="button" onClick={t.toggle} aria-pressed={t.checked}
                      className="w-11 h-6 rounded-full p-0.5 transition-colors flex items-center shrink-0"
                      style={{ backgroundColor: t.checked ? "var(--color-primary)" : "var(--color-border)" }}
                    >
                      <div className="w-5 h-5 bg-white rounded-full shadow transition-transform" style={{ transform: t.checked ? "translateX(20px)" : "translateX(0)" }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Sender */}
            <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <h3 className="font-black text-sm" style={{ color: "var(--color-primary)" }}>Your contact (sender)</h3>
              <input type="text" placeholder="Your name" value={pickupContactName} onChange={(e) => setPickupContactName(e.target.value)} className={`input ${fieldErrors.pickup_contact_name ? "input-error" : ""}`} />
              {fieldErrors.pickup_contact_name && <p className="error-text">{fieldErrors.pickup_contact_name}</p>}
              <input type="tel" placeholder="Your phone number" value={pickupPhone} onChange={(e) => setPickupPhone(e.target.value)} className={`input ${fieldErrors.pickup_contact_phone ? "input-error" : ""}`} />
              {fieldErrors.pickup_contact_phone && <p className="error-text">{fieldErrors.pickup_contact_phone}</p>}
              <textarea rows={2} placeholder="Pickup instructions (optional)" value={pickupNote} onChange={(e) => setPickupNote(e.target.value)} className="input resize-none" />
            </div>

            {/* Recipient */}
            <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <h3 className="font-black text-sm" style={{ color: "var(--color-primary)" }}>Recipient details</h3>
              <input type="text" placeholder="Recipient name" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className={`input ${fieldErrors.recipient_name ? "input-error" : ""}`} />
              {fieldErrors.recipient_name && <p className="error-text">{fieldErrors.recipient_name}</p>}
              <input type="tel" placeholder="Recipient phone number" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} className={`input ${fieldErrors.recipient_phone ? "input-error" : ""}`} />
              {fieldErrors.recipient_phone && <p className="error-text">{fieldErrors.recipient_phone}</p>}

              <div>
                <p className="text-[11px] font-bold tracking-widest mb-2" style={{ color: "var(--color-text-muted)" }}>DELIVERY PREFERENCE</p>
                <div className="flex gap-2">
                  {([
                    { value: "curb", label: "Meet at curb" },
                    { value: "meet", label: "Meet at door" },
                    { value: "leave", label: "Leave at door" },
                  ] as { value: MeetingDropoff; label: string }[]).map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setDropoffMeeting(opt.value)}
                      className="flex-1 py-2 px-1 rounded-xl text-xs font-semibold transition-all"
                      style={
                        dropoffMeeting === opt.value
                          ? { backgroundColor: "var(--color-primary)", color: "#fff" }
                          : { backgroundColor: "var(--color-bg)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <textarea rows={2} placeholder="Dropoff instructions (optional)" value={dropoffNote} onChange={(e) => setDropoffNote(e.target.value)} className="input resize-none" />
            </div>

            <button type="button" onClick={goToStep3} className="btn-primary w-full py-4 text-base font-bold rounded-2xl">
              Review order →
            </button>
          </div>
        )}

        {/* ── STEP 3 – Review & Pay ─────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Route */}
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: "var(--color-primary)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold tracking-widest" style={{ color: "var(--color-text-muted)" }}>FROM</p>
                    <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{pickupText}</p>
                    {pickupNote && <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{pickupNote}</p>}
                  </div>
                </div>
                <div className="ml-1.5 h-5 border-l-2 border-dashed" style={{ borderColor: "var(--color-border)" }} />
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-3 h-3 rounded-sm shrink-0" style={{ border: "2.5px solid var(--color-primary)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold tracking-widest" style={{ color: "var(--color-text-muted)" }}>TO</p>
                    <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{dropoffText}</p>
                    {dropoffNote && <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{dropoffNote}</p>}
                  </div>
                </div>
              </div>
              <div className="px-4 py-2.5 flex justify-end" style={{ borderTop: "1px solid var(--color-border)", backgroundColor: "var(--color-bg)" }}>
                <button type="button" onClick={() => setStep(1)} className="text-xs font-bold" style={{ color: "var(--color-primary)" }}>Edit addresses</button>
              </div>
            </div>

            {/* Parcel summary */}
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <div className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Package size</span>
                  <span className="text-sm font-semibold capitalize" style={{ color: "var(--color-text-primary)" }}>{packageType}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-sm shrink-0" style={{ color: "var(--color-text-secondary)" }}>Description</span>
                  <span className="text-sm font-semibold text-right" style={{ color: "var(--color-text-primary)" }}>{parcelDescription}</span>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {fragile && <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgb(245 158 11 / 0.12)", color: "var(--color-warning)" }}>Fragile</span>}
                  {requirePin && <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgb(59 130 246 / 0.12)", color: "var(--color-info)" }}>PIN required</span>}
                </div>
              </div>
              <div className="px-4 py-2.5 flex justify-end" style={{ borderTop: "1px solid var(--color-border)", backgroundColor: "var(--color-bg)" }}>
                <button type="button" onClick={() => setStep(2)} className="text-xs font-bold" style={{ color: "var(--color-primary)" }}>Edit details</button>
              </div>
            </div>

            {/* Contacts */}
            <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-widest" style={{ color: "var(--color-text-muted)" }}>SENDER</span>
                <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {pickupContactName || user?.full_name || "—"}{pickupPhone ? ` · ${pickupPhone}` : ""}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-widest" style={{ color: "var(--color-text-muted)" }}>RECIPIENT</span>
                <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {recipientName || "—"}{recipientPhone ? ` · ${recipientPhone}` : ""}
                </span>
              </div>
            </div>

            {/* Account status */}
            {user ? (
              <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <button
                  type="button"
                  onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); setUser(null); setStep(1); }}
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-opacity hover:opacity-70"
                  title="Log out"
                  style={{ backgroundColor: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--color-text-secondary)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 15l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>{user.full_name}</p>
                  <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>{user.email}</p>
                </div>
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: "var(--color-success)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
            ) : (
              <button type="button" onClick={() => setShowAuth(true)}
                className="w-full p-4 rounded-2xl text-sm font-bold flex items-center justify-between"
                style={{ backgroundColor: "var(--color-surface)", border: "1.5px dashed var(--color-primary)", color: "var(--color-primary)" }}
              >
                <span>Sign in to complete your order</span>
                <span>→</span>
              </button>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: "rgb(239 68 68 / 0.1)", color: "var(--color-error)" }}>{error}</div>
            )}
          </div>
        )}
      </div>

      {/* ── Sticky bottom pay bar (step 3 only) ─────────────────────────── */}
      {step === 3 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 py-4" style={{ backgroundColor: "var(--color-bg)", borderTop: "1px solid var(--color-border)" }}>
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Flat fee · No hidden costs</span>
              <span className="text-2xl font-black" style={{ color: "var(--color-primary)" }}>R99.00</span>
            </div>
            <button
              type="button"
              onClick={doSubmit}
              disabled={isProcessing || !user}
              className="btn-primary w-full py-4 text-base font-bold rounded-2xl"
              style={!user ? { opacity: 0.5, cursor: "not-allowed" } : {}}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  {payfastData ? "Redirecting to payment…" : "Processing…"}
                </span>
              ) : user ? "Pay R99 →" : "Sign in to pay →"}
            </button>
          </div>
        </div>
      )}

    </APIProvider>
  );
}
