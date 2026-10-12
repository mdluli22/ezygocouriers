export function formatMoney(amount: number | string | null, currency = "ZAR"): string {
  if (amount === null || amount === "" || !Number.isFinite(Number(amount))) return "Quote pending";
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency, minimumFractionDigits: 2 }).format(Number(amount));
}
