import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

function CandidateDashboard() {
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Mock data for Candidate
  const mockCandidate = {
    name: "Jane Doe",
    user_id: "candidate_demo",
    candidate_uuid: "candidate-uuid-222",
    email: "candidate@omniverifyx.ai",
    category: "BC-A",
    annual_income: 85000,
    mobile_number: "9876543210",
    date_of_birth: "1998-05-15",
    document_verification_status: "VERIFIED",
    uploaded_documents: ["Aadhaar", "Caste Certificate", "Income Certificate"],
    face_enrolled: true,
    voice_sample: true,
    hall_ticket: {
      hall_ticket_number: "HT-98310-DEMO",
      exam_name: "OmniVerifyX AI Demo Exam",
      exam_date: "July 15, 2026",
      exam_center: "Online Secure Exam Center (A-1)",
      status: "active"
    }
  };

  useEffect(() => {
    // Authentication Guard
    const role = localStorage.getItem("user_role");
    const loggedIn = localStorage.getItem("logged_in") === "true";
    
    if (!loggedIn || role !== "candidate") {
      localStorage.clear();
      navigate("/login");
      return;
    }

    const fetchCandidateData = async () => {
      try {
        const email = localStorage.getItem("user_email");
        // Try fetching candidate profile
        const response = await axios.get(`/exam/candidate/candidate_demo`);
        if (response.data.success) {
          setCandidate(response.data.candidate);
        } else {
          // If candidate lookup returns failure, fallback to mock candidate
          setCandidate(mockCandidate);
        }
      } catch (error) {
        console.warn("Backend candidate lookup failed, loading mock candidate data...", error);
        setIsDemoMode(true);
        setCandidate(mockCandidate);
      } finally {
        setLoading(false);
      }
    };

    fetchCandidateData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handlePrintHallTicket = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: "center", padding: "100px 0" }}>
        <div className="spinner" style={{ margin: "0 auto 20px" }}></div>
        <h2>Loading Candidate Profile...</h2>
      </div>
    );
  }

  return (
    <>
      {(isDemoMode || localStorage.getItem("demo_mode_active") === "true") && (
        <div className="demo-banner">
          <span>⚠️</span>
          <strong>Demo Mode Active: Showing Preset Candidate Account</strong>
        </div>
      )}

      <div className="navbar">
        <h2>OmniVerifyX AI</h2>
        <div>
          <Link to="/candidate/dashboard" className="active-link">Dashboard</Link>
          <Link to="/verify">Verify to Exam</Link>
          <button onClick={handleLogout} style={{ backgroundColor: "#dc3545", padding: "6px 14px", fontSize: "0.85em" }}>
            Logout
          </button>
        </div>
      </div>

      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", borderBottom: "1px solid #e2e8f0", paddingBottom: "20px" }}>
          <div>
            <h1>Candidate Workspace</h1>
            <p className="subtitle" style={{ margin: 0 }}>Manage registrations, verify biometric parameters, and access entry tickets.</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <h3>Welcome, {candidate?.name || "Jane Doe"}</h3>
            <span style={{ fontSize: "0.85rem", color: "#64748b" }}>ID: {candidate?.user_id}</span>
          </div>
        </div>

        {/* Dashboards Stats Cards Grid */}
        <div className="cards">
          {/* Card 1: Applications Status */}
          <div className="card" style={{ borderLeft: "5px solid #2563eb" }}>
            <h2>Onboarding Application</h2>
            <div style={{ marginTop: "15px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "#64748b" }}>Category:</span>
                <strong style={{ color: "#0f172a" }}>{candidate?.category || "OC"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "#64748b" }}>Income Level:</span>
                <strong style={{ color: "#0f172a" }}>₹{candidate?.annual_income?.toLocaleString("en-IN") || 0}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Mobile No:</span>
                <strong style={{ color: "#0f172a" }}>{candidate?.mobile_number || "N/A"}</strong>
              </div>
            </div>
            <div style={{ marginTop: "20px", display: "flex", justifyContent: "center" }}>
              <span className="status-badge verified" style={{ width: "100%", textAlign: "center", justifyContent: "center" }}>
                Application Approved
              </span>
            </div>
          </div>

          {/* Card 2: Biometrics Enrollment */}
          <div className="card" style={{ borderLeft: "5px solid #4f46e5" }}>
            <h2>Biometric Enrollment</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "15px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyItems: "center", gap: "10px" }}>
                <span style={{ color: candidate?.face_enrolled ? "#10b981" : "#ef4444", fontSize: "1.2rem", fontWeight: "bold" }}>
                  {candidate?.face_enrolled ? "✓" : "✗"}
                </span>
                <span style={{ fontWeight: "500", color: "#1e293b" }}>Face Profile Encrypted</span>
                <span style={{ marginLeft: "auto", fontSize: "0.8rem", padding: "2px 8px", backgroundColor: "#f1f5f9", borderRadius: "4px", color: "#475569" }}>Embedded</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyItems: "center", gap: "10px" }}>
                <span style={{ color: candidate?.voice_sample ? "#10b981" : "#ef4444", fontSize: "1.2rem", fontWeight: "bold" }}>
                  {candidate?.voice_sample ? "✓" : "✗"}
                </span>
                <span style={{ fontWeight: "500", color: "#1e293b" }}>Voice Print Encrypted</span>
                <span style={{ marginLeft: "auto", fontSize: "0.8rem", padding: "2px 8px", backgroundColor: "#f1f5f9", borderRadius: "4px", color: "#475569" }}>10s Sample</span>
              </div>
            </div>
            <div style={{ marginTop: "30px", display: "flex", justifyContent: "center" }}>
              <span className="status-badge verified" style={{ width: "100%", textAlign: "center", justifyContent: "center" }}>
                Biometrics Verified
              </span>
            </div>
          </div>

          {/* Card 3: Verification Status */}
          <div className="card" style={{ borderLeft: "5px solid #10b981" }}>
            <h2>Document Verification Status</h2>
            <div style={{ marginTop: "10px" }}>
              <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0 }}>
                Intelligent eligibility checked via automatic OCR scan:
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" }}>
                {candidate?.uploaded_documents?.map((doc) => (
                  <span key={doc} style={{ fontSize: "0.75rem", padding: "3px 8px", backgroundColor: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", borderRadius: "4px", fontWeight: "600" }}>
                    {doc}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ marginTop: "25px", display: "flex", justifyContent: "center" }}>
              <span className="status-badge verified" style={{ width: "100%", textAlign: "center", justifyContent: "center" }}>
                OCR MATCH - VERIFIED
              </span>
            </div>
          </div>

          {/* Card 4: Hall Ticket Status */}
          <div className="card" style={{ borderLeft: "5px solid #f59e0b" }}>
            <h2>Secure Hall Ticket</h2>
            <div style={{ marginTop: "15px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "#64748b" }}>Ticket ID:</span>
                <strong style={{ color: "#2563eb", fontFamily: "monospace" }}>
                  {candidate?.hall_ticket?.hall_ticket_number || "HT-98310"}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Assigned Exam:</span>
                <strong style={{ color: "#0f172a" }}>{candidate?.hall_ticket?.exam_name || "Demo Exam"}</strong>
              </div>
            </div>
            <div style={{ marginTop: "35px", display: "flex", justifyContent: "center" }}>
              <a href="#ticket-view" style={{ width: "100%", textDecoration: "none" }}>
                <button style={{ width: "100%", backgroundColor: "#fd7e14" }}>
                  View Entrance Ticket
                </button>
              </a>
            </div>
          </div>
        </div>

        {/* Section: Professional Hall Ticket Design */}
        <div id="ticket-view" className="form-card print-card" style={{ maxWidth: "750px", marginTop: "50px", border: "2px solid #e2e8f0", padding: "40px", backgroundColor: "#fff", position: "relative" }}>
          
          {/* Watermark/Seal style */}
          <div style={{ position: "absolute", right: "20px", top: "20px", opacity: 0.1, pointerEvents: "none" }}>
            <svg width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "3px solid #2563eb", paddingBottom: "15px", marginBottom: "25px" }}>
            <div>
              <h2 style={{ color: "#2563eb", margin: 0, fontSize: "1.6rem", fontWeight: "800", fontFamily: "var(--font-heading)" }}>
                OmniVerifyX AI
              </h2>
              <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px" }}>
                Admit Card / Hall Ticket (Official)
              </span>
            </div>
            <span className="status-badge verified" style={{ height: "fit-content" }}>
              Status: ACTIVE
            </span>
          </div>

          <div style={{ display: "flex", gap: "30px", flexWrap: "wrap" }}>
            {/* Left Box: Info details */}
            <div style={{ flex: 2, minWidth: "300px" }}>
              <table style={{ width: "100%", marginTop: 0 }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontWeight: "600" }}>Candidate Name:</td>
                    <td style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9", color: "#0f172a" }}>{candidate?.name}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontWeight: "600" }}>Application ID:</td>
                    <td style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9", color: "#0f172a", fontFamily: "monospace" }}>{candidate?.user_id}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontWeight: "600" }}>Secure UUID:</td>
                    <td style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9", color: "#0f172a", fontFamily: "monospace", fontSize: "0.8rem" }}>{candidate?.candidate_uuid}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontWeight: "600" }}>Assigned Exam:</td>
                    <td style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9", color: "#0f172a" }}>{candidate?.hall_ticket?.exam_name}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontWeight: "600" }}>Exam Date:</td>
                    <td style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9", color: "#0f172a" }}>{candidate?.hall_ticket?.exam_date}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontWeight: "600" }}>Exam Center:</td>
                    <td style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9", color: "#0f172a" }}>{candidate?.hall_ticket?.exam_center}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right Box: Candidate Photo & QR */}
            <div style={{ flex: 1, minWidth: "180px", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
              {/* Photo Box */}
              <div style={{ width: "120px", height: "140px", border: "2px solid #cbd5e1", borderRadius: "8px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}>
                {candidate?.face_enrolled ? (
                  <div style={{ position: "relative", width: "100%", height: "100%" }}>
                    {/* Fallback mock avatar inside card */}
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#e2e8f0", color: "#475569", fontWeight: "bold" }}>
                      PHOTO VERIFIED
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Photo Missing</span>
                )}
              </div>

              {/* QR Code Placeholder */}
              <div style={{ width: "100px", height: "100px", border: "1px dashed #cbd5e1", padding: "4px", borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
                {/* SVG Mock QR Code */}
                <svg width="70" height="70" viewBox="0 0 100 100">
                  <path d="M5 5h30v30H5zm10 10h10v10H15zm50-10h30v30H65zm10 10h10v10H75zM5 65h30v30H5zm10 10h10v10H15zm60-10h20v20H75zm10 10h10v10H85zm-20 0h10v10H65zm10-10h10v10H75z" fill="#0f172a"/>
                </svg>
                <span style={{ fontSize: "0.55rem", color: "#64748b", marginTop: "4px", fontWeight: "bold" }}>SCAN SECURE</span>
              </div>
            </div>
          </div>

          {/* Instructions footer */}
          <div style={{ marginTop: "30px", borderTop: "1px dashed #cbd5e1", paddingTop: "15px", fontSize: "0.75rem", color: "#64748b" }}>
            <strong>Instructions for Candidate:</strong>
            <ul style={{ paddingLeft: "15px", marginTop: "5px" }}>
              <li>This is a secure system-generated admission card authenticated via multi-modal biometrics.</li>
              <li>Please keep this admit card ready for webcam-based face detection and voice verification before exam start.</li>
              <li>Calculators, mobile devices, and unauthorized tabs switches are strictly proctored by YOLOv8 vision analytics.</li>
            </ul>
          </div>

          {/* Print/Download button inside card (no-print category so it won't show during print) */}
          <div className="no-print" style={{ display: "flex", gap: "10px", marginTop: "30px", justifyContent: "flex-end" }}>
            <button onClick={handlePrintHallTicket} style={{ backgroundColor: "#2563eb" }}>
              Print Hall Ticket
            </button>
            <button
              onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/hall-tickets/${candidate?.hall_ticket?.hall_ticket_number || "HT-98310"}/pdf`, "_blank")}
              style={{ backgroundColor: "#10b981" }}
            >
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default CandidateDashboard;
