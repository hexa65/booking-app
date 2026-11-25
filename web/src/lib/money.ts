const MAX_KOBO = 2_147_483_647; // PostgreSQL INTEGER (about 21 million naira)

export function formatNaira(minor: number): string {
  const whole = minor % 100 === 0;
  return new Intl.NumberFormat("en-NG", {
    style: "currency", currency: "NGN",
    minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2,
  }).format(minor / 100);
}

/** "3,000" or "3000.50" -> kobo as an integer. Returns null if it is not a valid price. */
export function nairaToKobo(text: string): number | null {
  const clean = text.replace(/[₦,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const [whole = "0", frac = ""] = clean.split(".");
  const kobo = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return Number.isSafeInteger(kobo) && kobo <= MAX_KOBO ? kobo : null;
}
