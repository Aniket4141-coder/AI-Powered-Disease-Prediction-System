import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingOverlay from "./LoadingOverlay";

export default function ProtectedRoute() {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingOverlay show message="Validating session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
