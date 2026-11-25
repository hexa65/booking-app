import { createBrowserRouter } from "react-router";
import type { RouteObject } from "react-router";
import { AppLayout } from "../layouts/AppLayout";
import { PublicLayout } from "../layouts/PublicLayout";
import { BookPage } from "../pages/public/BookPage";
import { BusinessPage } from "../pages/public/BusinessPage";
import { DonePage } from "../pages/public/DonePage";
import { JoinQueuePage } from "../pages/public/JoinQueuePage";
import { ManageBookingPage } from "../pages/public/ManageBookingPage";
import { QueueStatusPage } from "../pages/public/QueueStatusPage";
import NotFoundPage from "../pages/NotFoundPage";
import { ProtectedRoute } from "./ProtectedRoute";

// Owner pages load only when needed, so the customer's booking page stays small and fast.
const lazyPage = (load: () => Promise<{ default: React.ComponentType }>): Pick<RouteObject, "lazy"> => ({
  lazy: async () => ({ Component: (await load()).default }),
});

export const router = createBrowserRouter([
  { element: <PublicLayout />, children: [
    { path: "/b/:slug", element: <BusinessPage /> },
    { path: "/b/:slug/book", element: <BookPage /> },
    { path: "/b/:slug/done", element: <DonePage /> },
    { path: "/booking/:token", element: <ManageBookingPage /> },
    { path: "/b/:slug/queue", element: <JoinQueuePage /> },
    { path: "/queue/:token", element: <QueueStatusPage /> },
    { path: "/login", ...lazyPage(() => import("../pages/LoginPage")) },
    { path: "/register", ...lazyPage(() => import("../pages/RegisterPage")) },
  ] },
  { element: <ProtectedRoute />, children: [
    { path: "/app/setup", ...lazyPage(() => import("../pages/app/SetupPage")) },
    { element: <AppLayout />, children: [
      { path: "/app", ...lazyPage(() => import("../pages/app/TodayPage")) },
      { path: "/app/calendar", ...lazyPage(() => import("../pages/app/CalendarPage")) },
      { path: "/app/bookings", ...lazyPage(() => import("../pages/app/BookingsPage")) },
      { path: "/app/queue", ...lazyPage(() => import("../pages/app/QueuePage")) },
      { path: "/app/clients", ...lazyPage(() => import("../pages/app/ClientsPage")) },
      { path: "/app/services", ...lazyPage(() => import("../pages/app/ServicesPage")) },
      { path: "/app/staff", ...lazyPage(() => import("../pages/app/StaffPage")) },
      { path: "/app/reminders", ...lazyPage(() => import("../pages/app/RemindersPage")) },
      { path: "/app/stats", ...lazyPage(() => import("../pages/app/StatsPage")) },
      { path: "/app/settings", ...lazyPage(() => import("../pages/app/SettingsPage")) },
    ] },
  ] },
  { path: "*", element: <NotFoundPage /> },
]);
