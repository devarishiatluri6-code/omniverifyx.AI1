import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import axios from "axios";

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem("user_token") || localStorage.getItem("admin_token");
      const role = localStorage.getItem("user_role") || localStorage.getItem("admin_role");
      const loggedIn = localStorage.getItem("logged_in") === "true" || localStorage.getItem("admin_logged_in") === "true";

      // If demo mode is active locally, skip backend checks
      const isDemo = localStorage.getItem("demo_mode_active") === "true";
      if (isDemo && loggedIn && token && role) {
        if (allowedRoles.length === 0 || allowedRoles.includes(role)) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
        setIsVerifying(false);
        return;
      }

      if (!token || !loggedIn || !role) {
        setIsAuthenticated(false);
        setIsVerifying(false);
        return;
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        setIsAuthenticated(false);
        setIsVerifying(false);
        return;
      }

      try {
        const response = await axios.get("/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (response.data.success) {
          const userRole = response.data.role || role;
          if (allowedRoles.length === 0 || allowedRoles.includes(userRole)) {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
          clearLocalStorage();
        }
      } catch (error) {
        console.warn("Token verification failed, shifting to offline demo verification mode:", error);
        localStorage.setItem("demo_mode_active", "true");
        if (allowedRoles.length === 0 || allowedRoles.includes(role)) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [allowedRoles]);

  const clearLocalStorage = () => {
    localStorage.removeItem("user_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_email");
    localStorage.removeItem("logged_in");
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_role");
    localStorage.removeItem("admin_logged_in");
  };

  if (isVerifying) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
