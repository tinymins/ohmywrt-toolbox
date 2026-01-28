import { Navigate, Outlet, useLocation } from "react-router-dom";

type ProtectedRouteProps = {
  isAuthed: boolean;
  redirectTo?: string;
};

export default function ProtectedRoute({
  isAuthed,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const location = useLocation();
  if (!isAuthed) {
    const redirect = `${location.pathname}${location.search}`;
    const params = new URLSearchParams({ redirect });
    return <Navigate to={`${redirectTo}?${params.toString()}`} replace />;
  }

  return <Outlet />;
}
