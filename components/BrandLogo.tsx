import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  className?: string;
  subtitle?: string;
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  priority?: boolean;
  ariaLabel?: string;
};

export default function BrandLogo({
  href = "/",
  className = "",
  subtitle,
  variant = "light",
  size = "md",
  priority = false,
  ariaLabel = "EzyGo home",
}: BrandLogoProps) {
  return (
    <Link href={href} aria-label={ariaLabel} className={`ezygo-brand ezygo-brand-${variant} ezygo-brand-${size} ${className}`}>
      <Image className="ezygo-brand-image" src="/navbar-logo.png" alt="" width={1036} height={364} sizes={size === "lg" ? "100px" : "86px"} priority={priority} />
      <span className="ezygo-brand-copy">
        <span className="ezygo-brand-name">EzyGo</span>
        {subtitle && <span className="ezygo-brand-subtitle">{subtitle}</span>}
      </span>
    </Link>
  );
}
