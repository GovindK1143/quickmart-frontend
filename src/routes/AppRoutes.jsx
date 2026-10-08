import { Route, Routes } from "react-router-dom";
import Login from "../pages/auth/Login";
import ProtectedRoute from "./ProtectedRoute";
import Home from "../pages/customer/Home";
import Cart from "../pages/customer/Cart";
import Checkout from "../pages/customer/Checkout";

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

function Orders() {
  return (
    <div className="page-placeholder">
      <h1>My Orders</h1>
      <p>Order history will be implemented next.</p>
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
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/home" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Public cart - guest or customer */}
      <Route path="/cart" element={<Cart />} />

      {/* Customer-only routes */}
      <Route element={<ProtectedRoute allowedRoles={["CUSTOMER"]} />}>
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/orders" element={<Orders />} />
      </Route>

      {/* Admin-only routes */}
      <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
