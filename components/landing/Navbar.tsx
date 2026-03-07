import Link from "next/link";

export default function Navbar({ scrolled }: { scrolled: boolean }) {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        backgroundColor: scrolled ? "rgba(15,31,31,0.96)" : "transparent",
        backdropFilter:  scrolled ? "blur(12px)" : "none",
        borderBottom:    scrolled ? "1px solid rgba(61,102,102,0.4)" : "none",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-lg" style={{ backgroundColor: "#F59E0B", color: "#1A2F2F" }}>
            E
          </div>
          <span className="font-black text-xl tracking-tight text-white">EzyGo</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {["How it works", "Pricing", "About", "Contact"].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(/\s/g, "-")}`} className="text-sm font-medium text-white opacity-70 hover:opacity-100 transition-opacity">
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="text-sm font-semibold text-white opacity-80 hover:opacity-100 transition-opacity hidden sm:block">
            Sign in
          </Link>
          <Link href="/auth/signup" className="text-sm font-bold px-4 py-2 rounded-xl transition-all hover:scale-105" style={{ backgroundColor: "#F59E0B", color: "#1A2F2F" }}>
            Get started
          </Link>
        </div>
      </div>
    </nav>
  );
}
