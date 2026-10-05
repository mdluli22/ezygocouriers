import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Navigation, Package, ShieldCheck, Truck } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import "./login.css";

export default function LoginShell({ children, role, mode = "login" }: { children: React.ReactNode; role: "customer" | "driver"; mode?: "login" | "signup" }) {
  const driver = role === "driver";
  const signup = mode === "signup";
  return (
    <div className={`brand-login${signup ? " brand-signup" : ""}`}>
      <header className="brand-login-nav"><BrandLogo size="md" priority /><Link href="/" className="brand-login-home"><ArrowLeft size={15} aria-hidden="true" />Back to home</Link></header>
      <main className="brand-login-layout">
        <section className="brand-login-story" aria-label={driver ? "Deliver with EzyGo" : "Welcome to EzyGo"}>
          {/* <span className="brand-login-pill">{driver ? <Truck size={14} aria-hidden="true" /> : <Package size={14} aria-hidden="true" />}{driver ? "For the people on the move" : "Your local delivery partner"}</span> */}
          <h2>{driver ? "Every delivery." : "From your door."}<span>{driver ? "A little easier." : "To theirs. Fast."}</span></h2>
          <div className="brand-login-journey" aria-hidden="true">
            <div className="brand-login-journey-top"><span><Package size={20} /></span><div><small>{driver ? "Your delivery workspace" : "Delivery made simple"}</small><strong>{driver ? "Ready for your next stop" : "A little closer to their door"}</strong></div><i><Check size={16} /></i></div>
            <div className="brand-login-route"><div><span />Pickup</div><i /><Navigation size={19} /><i /><div><span />Drop-off</div></div>
            <div className="brand-login-journey-bottom"><ShieldCheck size={15} />{driver ? "From collection to a secure handover" : "Care at every step of the journey"}</div>
          </div>
          <ul className="brand-login-benefits">{(driver ? ["Clear pickup details", "Simple status updates", "Secure PIN handovers"] : ["Easy booking", "Delivery tracking", "Secure payments"]).map(item => <li key={item}><Check size={15} aria-hidden="true" />{item}</li>)}</ul>
        </section>
        <section className="brand-login-card" aria-label={signup ? "Create your customer account" : driver ? "Driver sign in" : "Customer sign in"}>
          {signup ? <div className="brand-signup-steps" aria-label="Registration steps"><span aria-current="step"><b>1</b>Create account</span><i aria-hidden="true" /><span><b>2</b>Verify email</span></div> : <nav className="brand-login-roles" aria-label="Choose your login"><Link href="/auth/login" aria-current={!driver ? "page" : undefined}>Customer</Link><Link href="/driver/login" aria-current={driver ? "page" : undefined}>Driver</Link></nav>}
          {children}
          <div className="brand-login-card-footer"><ShieldCheck size={14} aria-hidden="true" />Your next delivery starts here.<ArrowRight size={14} aria-hidden="true" /></div>
        </section>
      </main>
      <footer className="brand-login-footer"><span>© {new Date().getFullYear()} EzyGo Couriers</span><div><Link href="/legal/privacy-policy">Privacy</Link><Link href="/legal/terms-conditions">Terms</Link></div></footer>
    </div>
  );
}
