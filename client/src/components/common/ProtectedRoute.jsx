import { Navigate, Outlet, useLocation } from "react-router-dom";

import Loader from "./Loader";

export default function ProtectedRoute({ authStore, children }) {
  const location = useLocation();
  const isLoading = Boolean(authStore?.loading);
  const isAuthenticated = Boolean(authStore?.isAuthenticated);

  if (isLoading) {
    return <Loader fullPage label="Checking your session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children ?? <Outlet />;
}
