import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../app/AuthProvider";
import { Button } from "../components/ui/ui";

const LINKS = [
  { to: "/app", label: "Today", end: true }, { to: "/app/calendar", label: "Calendar" }, { to: "/app/queue", label: "Queue" },
  { to: "/app/bookings", label: "Bookings" }, { to: "/app/clients", label: "Clients" }, { to: "/app/reminders", label: "Reminders" },
  { to: "/app/services", label: "Services" }, { to: "/app/staff", label: "Staff" }, { to: "/app/stats", label: "Stats" }, { to: "/app/settings", label: "Settings" },
] as const;

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-3 pb-10">
      <a href="#main" className="sr-only focus:not-sr-only focus:bg-paper focus:p-3">Skip to main content</a>
      <header className="flex flex-wrap items-center justify-between gap-3 py-3">
        <p className="font-display text-xl font-bold">{user?.businessName ?? "Chairly"}</p>
        <Button variant="secondary" onClick={() => { logout(); navigate("/login"); }}>Log out</Button>
      </header>
      <nav aria-label="Main" className="mb-5 flex flex-wrap gap-2">
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} end={"end" in l ? l.end : false}
            className={({ isActive }) => `inline-flex min-h-12 items-center border-2 px-4 font-display text-lg font-bold ${isActive ? "border-ink bg-ink text-paper" : "border-ink bg-paper text-ink"}`}>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <main id="main"><Outlet /></main>
    </div>
  );
}
