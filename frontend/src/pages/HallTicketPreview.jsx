import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";

function HallTicketPreview() {
  const { ticketNumber } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const mockTicket = {
    hall_ticket_number: ticketNumber || "HT-98310-DEMO",
    candidate_name: "Jane Doe",
    user_id: "candidate_demo",
    candidate_uuid: "candidate-uuid-222",
    exam_name: "OmniVerifyX AI Demo Exam",
    exam_date: "July 15, 2026",
    start_time: "10:00 AM",
    duration_minutes: 10,
    exam_center: "Online Secure Exam Center (A-1)",
    status: "active"
  };

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await axios.get(`/hall-tickets/${ticketNumber}`);
        if (res.data.success && res.data.hall_ticket) {
          setTicket(res.data.hall_ticket);
        } else {
          setTicket(mockTicket);
        }
      } catch (e) {
        console.warn("Backend ticket fetch failed, loading mock ticket...", e);
        setIsDemoMode(true);
        setTicket(mockTicket);
      } finally {
        setLoading(false);
      }
    };

    if (ticketNumber) {
      fetchTicket();
    } else {
      setTicket(mockTicket);
      setLoading(false);
    }
  }, [ticketNumber]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: "center", padding: "100px 0" }}>
        <div className="spinner" style={{ margin: "0 auto 20px" }}></div>
        <h2>Loading Admission Ticket...</h2>
      </div>
    );
  }

  return (
    <>
      {isDemoMode && (
        <div className="demo-banner no-print">
          <span>⚠️</span>
          <strong>Demo Mode Active: Offline Ticket Preview</strong>
        </div>
      )}

      <div className="navbar no-print">
        <h2>OmniVerifyX AI</h2>
        <div>
          <Link to="/">Home</Link>
          <Link to="/candidate/dashboard">Back to Dashboard</Link>
          <button onClick={handlePrint} style={{ backgroundColor: "#2563eb" }}>Print Admit Card</button>
        </div>
      </div>

      <div className="container" style={{ maxWidth: "800px" }}>
        <div className="form-card print-card" style={{ maxWidth: "100%", border: "2px solid #0f172a", padding: "40px", backgroundColor: "#fff", position: "relative" }}>
          
          {/* Official Seals */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "3px solid #2563eb", paddingBottom: "15px", marginBottom: "30px" }}>
            <div>
              <h1 style={{ color: "#2563eb", margin: 0, fontSize: "1.8rem", fontWeight: "800", letterSpacing: "-0.5px" }}>
                OmniVerifyX AI
              </h1>
              <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>
                Official Examination Admission Ticket
              </span>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Ticket Number:</span>
              <strong style={{ fontSize: "1.2rem", color: "#2563eb", fontFamily: "monospace" }}>{ticket?.hall_ticket_number}</strong>
            </div>
          </div>

          <div style={{ display: "flex", gap: "40px", flexWrap: "wrap", margin: "20px 0" }}>
            {/* Info lists */}
            <div style={{ flex: 2, minWidth: "300px" }}>
              <h3 style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "8px", marginBottom: "15px", color: "#0f172a", fontSize: "1.1rem" }}>Candidate Details</h3>
              <table style={{ width: "100%", marginTop: 0 }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9", fontWeight: "600", width: "150px" }}>Full Name:</td>
                    <td style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9", color: "#0f172a" }}>{ticket?.candidate_name}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9", fontWeight: "600" }}>Application ID:</td>
                    <td style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9", color: "#0f172a", fontFamily: "monospace" }}>{ticket?.user_id}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9", fontWeight: "600" }}>Candidate UUID:</td>
                    <td style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9", color: "#0f172a", fontFamily: "monospace", fontSize: "0.85rem" }}>{ticket?.candidate_uuid || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9", fontWeight: "600" }}>Assigned Exam:</td>
                    <td style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9", color: "#0f172a", fontWeight: "bold" }}>{ticket?.exam_name}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9", fontWeight: "600" }}>Exam Date & Time:</td>
                    <td style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9", color: "#0f172a" }}>{ticket?.exam_date} at {ticket?.start_time} ({ticket?.duration_minutes} Minutes)</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9", fontWeight: "600" }}>Exam Center:</td>
                    <td style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9", color: "#0f172a" }}>{ticket?.exam_center || "Online Secure Exam Center (A-1)"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Photo & validation box */}
            <div style={{ flex: 1, minWidth: "180px", display: "flex", flexDirection: "column", alignItems: "center", gap: "25px" }}>
              <div style={{ width: "130px", height: "150px", border: "2px solid #cbd5e1", borderRadius: "8px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}>
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#e2e8f0", color: "#475569", fontWeight: "bold", fontSize: "0.9em" }}>
                  PHOTO SECURED
                </div>
              </div>

              <div style={{ width: "110px", height: "110px", border: "1px solid #cbd5e1", padding: "6px", borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
                <svg width="80" height="80" viewBox="0 0 100 100">
                  <path d="M5 5h30v30H5zm10 10h10v10H15zm50-10h30v30H65zm10 10h10v10H75zM5 65h30v30H5zm10 10h10v10H15zm60-10h20v20H75zm10 10h10v10H85zm-20 0h10v10H65zm10-10h10v10H75z" fill="#0f172a"/>
                </svg>
                <span style={{ fontSize: "0.55rem", color: "#64748b", marginTop: "4px", fontWeight: "bold" }}>SCAN TO VERIFY</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "30px", borderTop: "2px solid #2563eb", paddingTop: "20px" }}>
            <h3 style={{ color: "#0f172a", fontSize: "1rem", marginBottom: "8px" }}>Secure Entry Notice:</h3>
            <p style={{ fontSize: "0.8rem", color: "#475569", lineHeight: "1.6" }}>
              This document serves as an admission pass. The proctoring system employs real-time YOLOv8 object recognition and MediaPipe mesh check. Ensure your camera is properly positioned, and you are in a quiet room with minimal background noise. Do not navigate away from the test portal.
            </p>
          </div>

          <div className="no-print" style={{ marginTop: "35px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button onClick={handlePrint} style={{ backgroundColor: "#2563eb" }}>
              Print Hall Ticket
            </button>
            <button 
              onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/hall-tickets/${ticket?.hall_ticket_number}/pdf`, "_blank")}
              style={{ backgroundColor: "#10b981" }}
            >
              Download PDF
            </button>
            <button onClick={() => navigate(-1)} style={{ backgroundColor: "#64748b" }}>
              Go Back
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default HallTicketPreview;
