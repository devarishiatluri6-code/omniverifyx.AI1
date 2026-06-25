import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

function Login() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("admin"); // admin, candidate, student
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Validation and UI states
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Default credentials for easier demo
  useEffect(() => {
    if (activeTab === "admin") {
      setEmail("admin@omniverifyx.ai");
      setPassword("password123");
    } else if (activeTab === "candidate") {
      setEmail("candidate@omniverifyx.ai");
      setPassword("password123");
    } else {
      setEmail("student@omniverifyx.ai");
      setPassword("password123");
    }
    setErrorMessage("");
    setSuccessMessage("");
  }, [activeTab]);

  // Check if already logged in
  useEffect(() => {
    const role = localStorage.getItem("user_role") || localStorage.getItem("admin_role");
    const loggedIn = localStorage.getItem("logged_in") === "true" || localStorage.getItem("admin_logged_in") === "true";
    if (loggedIn && role) {
      redirectToDashboard(role);
    }
  }, [navigate]);

  const redirectToDashboard = (role) => {
    if (role === "admin") {
      navigate("/admin/dashboard");
    } else if (role === "candidate") {
      navigate("/candidate/dashboard");
    } else if (role === "student") {
      navigate("/student/dashboard");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    // Dynamic password validation (simple length check)
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      setIsLoading(false);
      return;
    }

    try {
      // API Login
      const response = await axios.post("/auth/login", {
        email,
        password
      });

      if (response.data.success) {
        const { token, role, email: userEmail } = response.data;
        
        // Save auth state
        localStorage.setItem("user_token", token);
        localStorage.setItem("user_role", role);
        localStorage.setItem("user_email", userEmail);
        localStorage.setItem("logged_in", "true");

        // Keep admin compatible keys if role is admin
        if (role === "admin") {
          localStorage.setItem("admin_token", token);
          localStorage.setItem("admin_role", role);
          localStorage.setItem("admin_logged_in", "true");
        }

        setSuccessMessage(`Login successful! Redirecting to ${role} dashboard...`);
        setTimeout(() => {
          redirectToDashboard(role);
        }, 1200);
      } else {
        setErrorMessage("Invalid credentials for this role.");
      }
    } catch (error) {
      console.warn("Backend auth failed, checking offline demo credentials...", error);
      
      // Fallback to offline demo mode
      const isDemoAdmin = email === "admin@omniverifyx.ai" && password === "password123" && activeTab === "admin";
      const isDemoCandidate = email === "candidate@omniverifyx.ai" && password === "password123" && activeTab === "candidate";
      const isDemoStudent = email === "student@omniverifyx.ai" && password === "password123" && activeTab === "student";

      if (isDemoAdmin || isDemoCandidate || isDemoStudent) {
        setIsDemoMode(true);
        localStorage.setItem("demo_mode_active", "true");
        
        const resolvedRole = activeTab;
        localStorage.setItem("user_token", `mock-jwt-token-${resolvedRole}`);
        localStorage.setItem("user_role", resolvedRole);
        localStorage.setItem("user_email", email);
        localStorage.setItem("logged_in", "true");

        if (resolvedRole === "admin") {
          localStorage.setItem("admin_token", "mock-jwt-token-admin");
          localStorage.setItem("admin_role", "admin");
          localStorage.setItem("admin_logged_in", "true");
        }

        setSuccessMessage(`Demo Mode Active. Login successful! Redirecting to ${resolvedRole} dashboard...`);
        setTimeout(() => {
          redirectToDashboard(resolvedRole);
        }, 1200);
      } else {
        setErrorMessage("Invalid credentials. Try using preset demo accounts.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isDemoMode || localStorage.getItem("demo_mode_active") === "true" && (
        <div className="demo-banner">
          <span>⚠️</span>
          <strong>Demo Mode Active: Offline Local Mock Engines Enabled</strong>
        </div>
      )}

      <div className="navbar">
        <h2>OmniVerifyX AI</h2>
        <div>
          <Link to="/">Home</Link>
          <Link to="/enroll">Enroll</Link>
          <Link to="/verify">Verify</Link>
          <Link to="/login" className="active-link">Login</Link>
        </div>
      </div>

      <div className="container">
        <h1>Access Secure Portal</h1>
        <p className="subtitle">Sign in to manage onboarding, view exam status, or proctor tests.</p>

        <div className="form-card" style={{ maxWidth: "480px" }}>
          {/* Role selection tabs */}
          <div style={{ display: "flex", borderBottom: "2px solid #e2e8f0", marginBottom: "25px" }}>
            {[
              { id: "admin", label: "Admin Portal" },
              { id: "candidate", label: "Candidate" },
              { id: "student", label: "Student" }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  borderBottom: activeTab === tab.id ? "3px solid #2563eb" : "none",
                  color: activeTab === tab.id ? "#2563eb" : "#64748b",
                  padding: "12px 6px",
                  borderRadius: 0,
                  fontSize: "0.95rem",
                  fontWeight: activeTab === tab.id ? "700" : "500",
                  cursor: "pointer",
                  boxShadow: "none",
                  transition: "all 0.15s ease"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Login</h2>
          
          <form onSubmit={handleLogin}>
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              placeholder={`${activeTab}@omniverifyx.ai`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />

            <label htmlFor="login-password">Password</label>
            <div style={{ position: "relative" }}>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                style={{ paddingRight: "45px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  color: "#64748b",
                  border: "none",
                  boxShadow: "none",
                  padding: "5px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {/* Password Validation indicator */}
            {password && (
              <div style={{ marginTop: "8px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ 
                  width: "8px", 
                  height: "8px", 
                  borderRadius: "50%", 
                  backgroundColor: password.length >= 6 ? "#10b981" : "#ef4444", 
                  display: "inline-block" 
                }}></span>
                <span style={{ color: password.length >= 6 ? "#047857" : "#b91c1c" }}>
                  {password.length >= 6 ? "Password meets strength requirements" : "Password must be at least 6 characters"}
                </span>
              </div>
            )}

            <button type="submit" disabled={isLoading} style={{ width: "100%", marginTop: "25px" }}>
              {isLoading ? (
                <>
                  <div className="spinner" style={{ width: "18px", height: "18px", borderWidth: "2px", margin: 0 }}></div>
                  Signing in...
                </>
              ) : (
                "Verify & Enter"
              )}
            </button>
          </form>

          {successMessage && (
            <div className="success" style={{ marginTop: "20px" }}>
              <span>✓</span>
              <div>{successMessage}</div>
            </div>
          )}

          {errorMessage && (
            <div className="error" style={{ marginTop: "20px" }}>
              <span>⚠️</span>
              <div>{errorMessage}</div>
            </div>
          )}

          {/* Quick Seeding Help */}
          <div style={{ marginTop: "25px", backgroundColor: "#f8fafc", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#475569" }}>Demo Credentials:</span>
            <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "5px", fontFamily: "monospace", display: "flex", flexDirection: "column", gap: "3px" }}>
              <div>Email: <strong>{activeTab}@omniverifyx.ai</strong></div>
              <div>Password: <strong>password123</strong></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;
