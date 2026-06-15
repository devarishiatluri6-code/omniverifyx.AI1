import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (localStorage.getItem("admin_logged_in") === "true") {
      navigate("/admin");
    }
  }, [navigate]);

  const handleLogin = (e) => {
    e.preventDefault();
    setErrorMessage("");

    // Hardcoded POC credentials
    if (email === "admin@omniverifyx.ai" && password === "Admin@123") {
      localStorage.setItem("admin_logged_in", "true");
      navigate("/admin");
    } else {
      setErrorMessage("Invalid Admin Credentials");
    }
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
              required
            />

            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <br />
            <br />

            <button type="submit">Login</button>
          </form>

          {errorMessage && (
            <div className="error" style={{ marginTop: "15px" }}>
              {errorMessage}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default AdminLogin;
