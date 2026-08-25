import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Authentication",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* ── Left Brand Panel ── */}
      <div
        className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        {/* Background geometric decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10"
            style={{ backgroundColor: "var(--color-accent)" }}
          />
          <div
            className="absolute bottom-0 -left-24 w-80 h-80 rounded-full opacity-10"
            style={{ backgroundColor: "var(--color-accent)" }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-5"
            style={{ border: "60px solid var(--color-accent)" }}
          />
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        {/* Logo */}
        <Link href="/" className="relative z-10 flex items-center gap-3 group">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-lg transition-transform group-hover:scale-105"
            style={{
              backgroundColor: "var(--color-accent)",
              color: "var(--color-primary)",
            }}
          >
            E
          </div>
          <span className="text-white font-bold text-xl tracking-tight">
            EzyGo
          </span>
        </Link>

        {/* Brand copy */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight">
              Deliver with
              <br />
              <span style={{ color: "var(--color-accent)" }}>confidence.</span>
            </h2>
            <p className="mt-4 text-lg opacity-75 text-white leading-relaxed max-w-sm">
              Fast, reliable courier delivery across South Africa. Flat R99 for
              every delivery, no surprises.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: "R99", label: "Flat delivery fee" },
              { value: "Real-time", label: "Live tracking" },
              // { value: "3 roles", label: "Customer · Driver · Admin" },
              // { value: "Secure", label: "Better Auth + Google" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl p-4"
                style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
              >
                <div
                  className="text-lg font-black"
                  style={{ color: "var(--color-accent)" }}
                >
                  {stat.value}
                </div>
                <div className="text-xs text-white opacity-60 mt-0.5 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-white opacity-40 text-sm">
          © {new Date().getFullYear()} EzyGo. All rights reserved.
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div
        className="flex-1 flex flex-col min-h-screen overflow-y-auto"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center justify-between p-6 border-b" style={{ borderColor: "var(--color-border)" }}>
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-base shadow"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--color-accent)",
              }}
            >
              E
            </div>
            <span className="font-bold text-lg" style={{ color: "var(--color-primary)" }}>
              EzyGo
            </span>
          </Link>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
