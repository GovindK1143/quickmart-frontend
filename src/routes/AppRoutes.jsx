import { Navigate, Route, Routes } from "react-router-dom";

function Home() {
  return (
    <div className="page-placeholder">
      <h1>QuickMart</h1>
      <p>QuickMart frontend is ready.</p>
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
      <Route path="/" element={<Home />} />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
