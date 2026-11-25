import { Navigate, Outlet } from "react-router";
import { Skeleton } from "../components/ui/ui";
import { useAuth } from "./AuthProvider";

export function ProtectedRoute() {
  const { status } = useAuth();
  if (status === "loading") return <div className="p-6"><Skeleton className="h-10 w-48" /></div>;
  if (status === "anon") return <Navigate to="/login" replace />;
  return <Outlet />;
}
