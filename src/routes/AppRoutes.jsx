import { Route, Routes } from "react-router-dom";
import Login from "../pages/auth/Login";
import ProtectedRoute from "./ProtectedRoute";
import { useAuth } from "../context/useAuth";

function Home() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="page-placeholder">
      <h1>QuickMart</h1>

      <p>Welcome, {user?.name}</p>

      <button type="button" onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}

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
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute allowedRoles={["CUSTOMER"]} />}>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
