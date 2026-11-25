/** Turns "0801 234 5678" or "+234 801 234 5678" into "+2348012345678". Returns null for nonsense. */
export function normalizePhone(input: string, defaultCountryCode = "234"): string | null {
  const trimmed = input.trim();
  if (!/^[+\d\s().-]+$/.test(trimmed)) return null;
  const hasPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");
  if (digits.length === 0) return null;
  if (!hasPlus && digits.startsWith("00")) digits = digits.slice(2);
  else if (!hasPlus && digits.startsWith("0")) digits = defaultCountryCode + digits.slice(1);
  else if (!hasPlus && !digits.startsWith(defaultCountryCode) && digits.length === 10) digits = defaultCountryCode + digits;
  if (digits.length < 8 || digits.length > 15) return null;
  if (digits.startsWith("234") && digits.length !== 13) return null; // Nigerian numbers: 234 + 10 digits
  return `+${digits}`;
}
