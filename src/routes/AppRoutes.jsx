import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ProtectedRoute from "./ProtectedRoute";
import Home from "../pages/customer/Home";
import Cart from "../pages/customer/Cart";
import Checkout from "../pages/customer/Checkout";
import Orders from "../pages/customer/Orders";
import Profile from "../pages/customer/Profile";
import AdminDashboard from "../pages/admin/AdminDashboard";
import { useAuth } from "../context/useAuth";

function NotFound() {
  return (
    <div className="page-placeholder">
      <h1>404</h1>
      <p>Page not found.</p>
    </div>
  );
}

function RoleBasedHome() {
  const { user, loading, isAuthenticated } = useAuth();

  // Wait until the existing authentication session is checked.
  if (loading) {
    return (
      <div className="page-placeholder">
        <p>Loading...</p>
      </div>
    );
  }

  // Administrators should always land on the Admin Dashboard.
  if (user?.role === "ADMIN" && isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  // Preserve the normal customer and guest homepage.
  return <Home />;
}

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();

  // Remember the page visible behind the login/register modal.
  const backgroundLocation = location.state?.backgroundLocation;

  const closeAuthModal = () => {
    if (backgroundLocation) {
      const { pathname, search, hash, state } = backgroundLocation;

      navigate({ pathname, search, hash }, { replace: true, state });
    } else {
      navigate("/home", { replace: true });
    }
  };

  return (
    <>
      <Routes location={backgroundLocation || location}>
        <Route path="/" element={<RoleBasedHome />} />
        <Route path="/home" element={<RoleBasedHome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/cart" element={<Cart />} />

        <Route element={<ProtectedRoute allowedRoles={["CUSTOMER"]} />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<Orders />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Existing login/register modal routing */}
      {backgroundLocation && (
        <Routes>
          <Route
            path="/login"
            element={<Login isModal onClose={closeAuthModal} />}
          />

          <Route
            path="/register"
            element={<Register isModal onClose={closeAuthModal} />}
          />
        </Routes>
      )}
    </>
  );
}

export default AppRoutes;
