"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function DriverLoginPage() {
  return (
    <Suspense>
      <DriverLoginForm />
    </Suspense>
  );
}

function DriverLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [serverError, setServerError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Show error if redirected back with a query param
  useEffect(() => {
    if (searchParams.get("error") === "unauthorized") {
      setServerError("You must be logged in as a driver to access that page.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setServerError("");
    setFieldErrors({});

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403 && data.errors?.email) {
          router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
        if (data.errors) {
          setFieldErrors(data.errors);
        } else {
          setServerError(data.message || "Login failed. Please try again.");
        }
        return;
      }

      // Only allow driver role
      if (data.data?.role !== "driver") {
        setServerError("This portal is for drivers only. Please use the correct login page.");
        await fetch("/api/auth/logout", { method: "POST" });
        return;
      }

      const redirect = searchParams.get("redirect");
      router.push(redirect || "/driver");
    } catch {
      setServerError("Something went wrong. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left Brand Panel ── */}
      <div
        className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10" style={{ backgroundColor: "var(--color-accent)" }} />
          <div className="absolute bottom-0 -left-24 w-80 h-80 rounded-full opacity-10" style={{ backgroundColor: "var(--color-accent)" }} />
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        </div>

        <BrandLogo
          className="relative z-10"
          variant="dark"
          size="lg"
          priority
        />

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight">
              Driver
              <br />
              <span style={{ color: "var(--color-accent)" }}>Portal</span>
            </h2>
            <p className="mt-4 text-lg opacity-75 text-white leading-relaxed max-w-sm">
              Manage your deliveries, update statuses, and earn on your own schedule.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { value: "Real-time", label: "Live job updates" },
              { value: "Simple", label: "Easy status updates" },
              { value: "Flexible", label: "Work your own hours" },
              { value: "Trackable", label: "Full delivery history" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl p-4" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                <div className="text-lg font-black" style={{ color: "var(--color-accent)" }}>{stat.value}</div>
                <div className="text-xs text-white opacity-60 mt-0.5 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs opacity-40 text-white">
          © {new Date().getFullYear()} EzyGo Couriers
        </p>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10" style={{ backgroundColor: "var(--color-bg)" }}>
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <BrandLogo className="lg:hidden" size="sm" priority />

          {/* Header */}
          <div>
            <h1 className="text-3xl font-black tracking-tight" style={{ color: "var(--color-primary)" }}>
              Driver sign in
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Not a driver?{" "}
              <Link href="/auth/login" className="font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity" style={{ color: "var(--color-primary)" }}>
                Customer login
              </Link>
            </p>
          </div>

          {/* Server error */}
          {serverError && (
            <div className="flex items-start gap-3 p-4 rounded-xl text-sm font-medium" style={{ backgroundColor: "rgb(239 68 68 / 0.08)", color: "var(--color-error)", border: "1px solid rgb(239 68 68 / 0.2)" }}>
              <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              {serverError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="email" className="label">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="driver@example.com"
                className={`input ${fieldErrors.email ? "input-error" : ""}`}
                required
              />
              {fieldErrors.email && <p className="error-text">{fieldErrors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`input pr-12 ${fieldErrors.password ? "input-error" : ""}`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-opacity hover:opacity-60"
                  style={{ color: "var(--color-text-muted)" }}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && <p className="error-text">{fieldErrors.password}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                "Sign in to Driver Portal"
              )}
            </button>
          </form>

          <p className="text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
            Need access?{" "}
            <a href="mailto:support@ezygocouriers.co.za" className="underline underline-offset-2 hover:opacity-80 transition-opacity">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
