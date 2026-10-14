import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Login from "../pages/auth/Login";
import ProtectedRoute from "./ProtectedRoute";
import Home from "../pages/customer/Home";
import Cart from "../pages/customer/Cart";
import Checkout from "../pages/customer/Checkout";
import Orders from "../pages/customer/Orders";

function AdminDashboard() {
  return (
    <div className="page-placeholder">
      <h1>QuickMart Admin</h1>
      <p>Admin dashboard will be implemented next.</p>
    </div>
  );
}

function Register() {
  return (
    <div className="page-placeholder">
      <h1>Registration</h1>
      <p>Registration page will be implemented next.</p>
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

  // Remember the page visible behind the login modal.
  const backgroundLocation = location.state?.backgroundLocation;

  const closeLoginModal = () => {
    if (backgroundLocation) {
      const { pathname, search, hash, state } = backgroundLocation;

      navigate({ pathname, search, hash }, { replace: true, state });
    } else {
      navigate("/home", { replace: true });
    }
  };

  return (
    <>
      {/* Render the previous page behind the login popup. */}
      <Routes location={backgroundLocation || location}>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/cart" element={<Cart />} />

        <Route element={<ProtectedRoute allowedRoles={["CUSTOMER"]} />}>
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<Orders />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Render Login again, this time as a modal over the background page. */}
      {backgroundLocation && (
        <Routes>
          <Route
            path="/login"
            element={<Login isModal onClose={closeLoginModal} />}
          />
        </Routes>
      )}
    </>
  );
}

export default AppRoutes;
