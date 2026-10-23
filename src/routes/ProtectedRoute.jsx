import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

function ProtectedRoute({ allowedRoles }) {
  const { user, loading, logoutInProgress } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-placeholder">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    // Logging out should always lead to the homepage.
    if (logoutInProgress) {
      return <Navigate to="/home" replace />;
    }

    // Preserve existing behavior for other unauthenticated visits.
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: {
            pathname: location.pathname,
            search: location.search,
          },
        }}
      />
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
