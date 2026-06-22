import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("admin_logged_in") === "true") {
      navigate("/admin/dashboard");
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);
 
    try {
      const response = await axios.post("/auth/login", {
        email,
        password
      });

      if (response.data.success) {
        localStorage.setItem("admin_token", response.data.token);
        localStorage.setItem("admin_role", response.data.role);
        localStorage.setItem("admin_logged_in", "true");
        navigate("/admin/dashboard");
      } else {
        setErrorMessage("Invalid Admin Credentials");
      }
    } catch (error) {
      console.error("Login error:", error);
      if (error.response && error.response.data && error.response.data.detail) {
        setErrorMessage(error.response.data.detail);
      } else {
        setErrorMessage("Failed to connect to authentication server");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    alert("Password reset instructions have been sent to system administrators.");
  };

  return (
    <>
      <div className="navbar">
        <h2>OmniVerifyX AI</h2>
        <div>
          <Link to="/">Home</Link>
          <Link to="/enroll">Enroll</Link>
          <Link to="/verify">Verify</Link>
          <Link to="/admin">Admin</Link>
          <Link to="/admin/exams">Exams</Link>
        </div>
      </div>

      <div className="container">
        <h1>Admin Portal Login</h1>
        <p className="subtitle">System Administrator Access Only</p>

        <div className="form-card" style={{ maxWidth: "450px", margin: "30px auto" }}>
          <form onSubmit={handleLogin}>
            <label htmlFor="admin-email">Email Address</label>
            <input
              id="admin-email"
              type="email"
              placeholder="admin@omniverifyx.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />

            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />

            <br />
            
            <div style={{ textAlign: "right", marginTop: "5px" }}>
              <a href="#forgot" onClick={handleForgotPassword} style={{ fontSize: "0.85em", color: "#007bff", textDecoration: "none" }}>
                Forgot Password?
              </a>
            </div>

            <br />

            <button type="submit" disabled={isLoading} style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", width: "100%" }}>
              {isLoading ? (
                <>
                  <div className="button-spinner" style={{
                    width: "18px",
                    height: "18px",
                    border: "2px solid #ffffff",
                    borderTop: "2px solid transparent",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite"
                  }}></div>
                  Signing in...
                </>
              ) : (
                "Login"
              )}
            </button>
          </form>

          {errorMessage && (
            <div className="error" style={{ marginTop: "15px" }}>
              {errorMessage}
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

export default AdminLogin;
