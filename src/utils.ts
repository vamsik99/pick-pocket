export const INR_USD_RATE = 83; // 1 USD = 83 INR

export function convertAmount(amount: number, from: string, to: string): number {
  const f = from === "₹" || from === "INR" ? "INR" : "USD";
  const t = to === "₹" || to === "INR" ? "INR" : "USD";
  if (f === t) return amount;
  if (f === "USD" && t === "INR") return amount * INR_USD_RATE;
  if (f === "INR" && t === "USD") return amount / INR_USD_RATE;
  return amount; // fallback
}

export function getCurrencySymbol(currency: string): string {
  return currency === "INR" || currency === "₹" ? "₹" : "$";
}
