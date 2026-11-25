const RESERVED = new Set(["api", "app", "admin", "b", "booking", "queue", "login", "register", "health", "public", "bookings", "auth", "static", "assets"]);

/** "Crown Cuts & Salon!" -> "crown-cuts-salon". Never empty, never reserved. */
export function slugify(name: string): string {
  const base = name
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  if (base === "") return "shop";
  return RESERVED.has(base) ? `${base}-shop` : base;
}

/** attempt 1 -> "crown-cuts", attempt 2 -> "crown-cuts-2", ... */
export function slugCandidate(base: string, attempt: number): string {
  return attempt <= 1 ? base : `${base}-${attempt}`;
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length <= 50;
}
