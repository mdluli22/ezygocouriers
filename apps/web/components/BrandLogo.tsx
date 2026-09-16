import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  className?: string;
  wordmarkClassName?: string;
  subtitle?: string;
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  priority?: boolean;
  ariaLabel?: string;
};

const logoSizes = {
  sm: { width: 72, height: 20, surface: "rounded-lg px-2 py-1" },
  md: { width: 86, height: 23, surface: "rounded-[10px] px-2.5 py-1.5" },
  lg: { width: 100, height: 27, surface: "rounded-xl px-3 py-2" },
};

export default function BrandLogo({
  href = "/",
  className = "",
  wordmarkClassName = "",
  subtitle,
  variant = "light",
  size = "md",
  priority = false,
  ariaLabel = "EzyGo home",
}: BrandLogoProps) {
  const dimensions = logoSizes[size];
  const isDark = variant === "dark";

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={`group inline-flex w-fit items-center gap-2.5 ${className}`}
    >
      <span
        className={`inline-flex shrink-0 items-center justify-center border border-black/10 bg-[#F7FBF8] shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5 ${dimensions.surface}`}
      >
        <Image
          src="/GoLogo.png"
          alt=""
          width={dimensions.width}
          height={dimensions.height}
          priority={priority}
          className="h-auto"
        />
      </span>

      <span className={`flex flex-col ${wordmarkClassName}`}>
        <span
          className={`font-bold leading-none tracking-tight ${
            size === "lg" ? "text-xl" : size === "md" ? "text-lg" : "text-base"
          }`}
          style={{ color: isDark ? "white" : "var(--color-primary)" }}
        >
          EzyGo
        </span>
        {subtitle && (
          <span
            className="mt-1 text-[10px] font-semibold uppercase leading-none tracking-[0.14em]"
            style={{ color: isDark ? "rgba(255,255,255,0.55)" : "var(--color-text-muted)" }}
          >
            {subtitle}
          </span>
        )}
      </span>
    </Link>
  );
}
