import { Outlet } from "react-router";

export function PublicLayout() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4">
      <a href="#main" className="sr-only focus:not-sr-only focus:bg-paper focus:p-3">Skip to main content</a>
      <main id="main" className="flex-1 py-6"><Outlet /></main>
      <footer className="py-6 text-moss">Bookings by Chairly</footer>
    </div>
  );
}
