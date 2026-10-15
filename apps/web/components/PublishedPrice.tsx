"use client";
import { formatMoney } from "@/lib/currency";
import { createContext, useContext, useEffect } from "react";
import { useRemote } from "@/components/ui/useRemote";
const PriceContext = createContext("Price available at checkout");
export function PricingProvider({ children }: { children: React.ReactNode }) {
  const { data, reload } = useRemote<{ data: { amount: number; currency: string } }>("/api/pricing");
  useEffect(() => {
    const refresh = () => { if (!document.hidden) reload(); };
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("ezygo:pricing-updated", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh); window.removeEventListener("ezygo:pricing-updated", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [reload]);
  const price = data?.data;
  return <PriceContext.Provider value={price ? formatMoney(price.amount, price.currency) : "Price available at checkout"}>{children}</PriceContext.Provider>;
}
export const usePublishedPrice = () => useContext(PriceContext);
export default function PublishedPrice() { return <>{usePublishedPrice()}</>; }
