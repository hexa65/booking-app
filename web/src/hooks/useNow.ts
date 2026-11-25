import { useEffect, useState } from "react";
import type { LocalNow } from "../lib/time";
import { nowInTimezone } from "../lib/time";

/** The shop's wall-clock "now", refreshed every 30 seconds (drives the "now" line). */
export function useNow(timezone = "Africa/Lagos"): LocalNow {
  const [now, setNow] = useState<LocalNow>(() => nowInTimezone(timezone, new Date()));
  useEffect(() => {
    const tick = (): void => setNow(nowInTimezone(timezone, new Date()));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [timezone]);
  return now;
}
