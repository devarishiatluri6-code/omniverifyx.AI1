import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

function StudentDashboard() {
  const navigate = useNavigate();
  
  const [student, setStudent] = useState(null);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Mock data for Student
  const mockStudent = {
    name: "John Smith",
    user_id: "student_demo",
    email: "student@omniverifyx.ai",
    face_verified: true,
    voice_verified: true,
    verification_status: "VERIFIED"
  };

  const mockExams = [
    {
      exam_id: "AUTO-DEMO-EXAM",
      exam_name: "OmniVerifyX AI Demo Exam",
      exam_type: "university",
      description: "Secure proctoring verification demo exam",
      exam_date: "2026-07-15",
      start_time: "10:00 AM",
      duration_minutes: 10,
      status: "published"
    },
    {
      exam_id: "MID-TERM-CS101",
      exam_name: "Introduction to Computer Science Mid-Term",
      exam_type: "university",
      description: "CS101 theory and application test",
      exam_date: "2026-07-20",
      start_time: "02:00 PM",
      duration_minutes: 60,
      status: "published"
    }
  ];

  useEffect(() => {
    // Authentication Guard
    const role = localStorage.getItem("user_role");
    const loggedIn = localStorage.getItem("logged_in") === "true";
    
    if (!loggedIn || role !== "student") {
      localStorage.clear();
      navigate("/login");
      return;
    }

    const fetchStudentData = async () => {
      try {
        const response = await axios.get("/exams/");
        setExams(response.data || []);
        
        const candRes = await axios.get(`/exam/candidate/student_demo`);
        if (candRes.data.success) {
          setStudent(candRes.data.candidate);
        } else {
          setStudent(mockStudent);
        }
      } catch (error) {
        console.warn("Backend student lookups failed, loading mock student data...", error);
        setIsDemoMode(true);
        setStudent(mockStudent);
        setExams(mockExams);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: "center", padding: "100px 0" }}>
        <div className="spinner" style={{ margin: "0 auto 20px" }}></div>
        <h2>Loading Student Workspace...</h2>
      </div>
    );
  }

  return (
    <>
      {(isDemoMode || localStorage.getItem("demo_mode_active") === "true") && (
        <div className="demo-banner">
          <span>⚠️</span>
          <strong>Demo Mode Active: Offline Verification Engines Enabled</strong>
        </div>
      )}

      <div className="navbar">
        <h2>OmniVerifyX AI</h2>
        <div>
          <Link to="/student/dashboard" className="active-link">Dashboard</Link>
          <Link to="/verify">Verify to Exam</Link>
          <button onClick={handleLogout} style={{ backgroundColor: "#dc3545", padding: "6px 14px", fontSize: "0.85em" }}>
            Logout
          </button>
        </div>
      </div>

      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", borderBottom: "1px solid #e2e8f0", paddingBottom: "20px" }}>
          <div>
            <h1>Student Examination Desk</h1>
            <p className="subtitle" style={{ margin: 0 }}>View assigned assessments, verify access tokens, and sit for secure proctored exams.</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <h3>Welcome, {student?.name || "John Smith"}</h3>
            <span style={{ fontSize: "0.85rem", color: "#64748b" }}>ID: {student?.user_id}</span>
          </div>
        </div>

        {/* Statistics Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "35px" }}>
          <div className="card" style={{ borderLeft: "5px solid #2563eb" }}>
            <h3 style={{ margin: "0 0 5px 0", fontSize: "0.9em", color: "#64748b" }}>Assigned Exams</h3>
            <h1 style={{ margin: 0, fontSize: "2rem" }}>{exams.length}</h1>
          </div>
          <div className="card" style={{ borderLeft: "5px solid #10b981" }}>
            <h3 style={{ margin: "0 0 5px 0", fontSize: "0.9em", color: "#64748b" }}>Verification Status</h3>
            <span className="status-badge verified" style={{ marginTop: "5px" }}>
              {student?.document_verification_status || "VERIFIED"}
            </span>
          </div>
          <div className="card" style={{ borderLeft: "5px solid #4f46e5" }}>
            <h3 style={{ margin: "0 0 5px 0", fontSize: "0.9em", color: "#64748b" }}>Liveness Status</h3>
            <span className="status-badge verified" style={{ marginTop: "5px" }}>
              Passed
            </span>
          </div>
          <div className="card" style={{ borderLeft: "5px solid #f59e0b" }}>
            <h3 style={{ margin: "0 0 5px 0", fontSize: "0.9em", color: "#64748b" }}>Upcoming Exams</h3>
            <h1 style={{ margin: 0, fontSize: "2rem" }}>{exams.filter(e => e.status === "published").length}</h1>
          </div>
        </div>

        <div style={{ display: "flex", gap: "30px", flexWrap: "wrap" }}>
          {/* Assigned Exams Table - Left Box */}
          <div className="form-card" style={{ flex: 2, minWidth: "500px", margin: 0, maxWidth: "100%" }}>
            <h2 style={{ marginBottom: "15px" }}>Assigned Exam Desk</h2>
            {exams.length === 0 ? (
              <p style={{ color: "#64748b", padding: "20px 0" }}>No secure exams are currently assigned to your desk.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Exam Name</th>
                      <th>Exam Date</th>
                      <th>Start Time</th>
                      <th>Duration</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map((exam) => (
                      <tr key={exam.exam_id}>
                        <td>
                          <strong>{exam.exam_name}</strong>
                          <div style={{ fontSize: "0.8rem", color: "#64748b", fontFamily: "monospace" }}>ID: {exam.exam_id.substring(0, 8)}...</div>
                        </td>
                        <td>{exam.exam_date}</td>
                        <td>{exam.start_time}</td>
                        <td>{exam.duration_minutes} mins</td>
                        <td>
                          <span className="status-badge verified" style={{ textTransform: "capitalize" }}>
                            {exam.status}
                          </span>
                        </td>
                        <td>
                          <Link to="/verify" state={{ hallTicketNumber: student?.user_id }}>
                            <button style={{ padding: "6px 12px", fontSize: "0.85em", backgroundColor: "#10b981" }}>
                              Verify & Start
                            </button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Secure Proctored Instructions - Right Box */}
          <div className="form-card" style={{ flex: 1, minWidth: "300px", margin: 0 }}>
            <h2>Exam Integrity Guidelines</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "15px" }}>
              <div style={{ padding: "12px", backgroundColor: "#f8fafc", borderRadius: "8px", borderLeft: "4px solid #4f46e5" }}>
                <strong style={{ display: "block", color: "#4f46e5", fontSize: "0.9rem", marginBottom: "4px" }}>Biometric Access Token</strong>
                <p style={{ fontSize: "0.82rem", color: "#475569" }}>
                  Before starting any exam, you must complete the face verification and voice sample matching.
                </p>
              </div>

              <div style={{ padding: "12px", backgroundColor: "#f8fafc", borderRadius: "8px", borderLeft: "4px solid #ef4444" }}>
                <strong style={{ display: "block", color: "#ef4444", fontSize: "0.9rem", marginBottom: "4px" }}>YOLO Active Monitoring</strong>
                <p style={{ fontSize: "0.82rem", color: "#475569" }}>
                  The proctoring system actively uses your webcam to monitor face positioning, multi-face access, and detect any mobile device.
                </p>
              </div>

              <div style={{ padding: "12px", backgroundColor: "#f8fafc", borderRadius: "8px", borderLeft: "4px solid #f59e0b" }}>
                <strong style={{ display: "block", color: "#f59e0b", fontSize: "0.9rem", marginBottom: "4px" }}>Browser Tab Restriction</strong>
                <p style={{ fontSize: "0.82rem", color: "#475569" }}>
                  Do not switch browser tabs or windows during active exam periods. Tab switching triggers alerts that flag your exam for manual review.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default StudentDashboard;
