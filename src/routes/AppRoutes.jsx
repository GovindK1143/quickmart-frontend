import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ProtectedRoute from "./ProtectedRoute";
import Home from "../pages/customer/Home";
import Cart from "../pages/customer/Cart";
import Checkout from "../pages/customer/Checkout";
import Orders from "../pages/customer/Orders";
import Profile from "../pages/customer/Profile";

function AdminDashboard() {
  return (
    <div className="page-placeholder">
      <h1>QuickMart Admin</h1>
      <p>Admin dashboard will be implemented next.</p>
    </div>
  );
}

function NotFound() {
  return (
    <div className="page-placeholder">
      <h1>404</h1>
      <p>Page not found.</p>
    </div>
  );
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
      {/* Render the previous page behind the login/register popup. */}
      <Routes location={backgroundLocation || location}>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
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

      {/* One modal route set handles both login and registration popups. */}
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
