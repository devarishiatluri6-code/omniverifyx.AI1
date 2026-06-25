import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend
} from "recharts";

function AdminDashboard() {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search and detail states
  const [searchUserId, setSearchUserId] = useState("");
  const [sessions, setSessions] = useState([]);
  const [violations, setViolations] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Candidates document details state
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Mock Admin Dashboard Data
  const mockDashboard = {
    total_candidates: 45,
    total_exams: 5,
    active_sessions: 2,
    completed_exams: 38,
    pass_rate: 86,
    average_score: 79,
    average_risk_score: 14,
    total_violations: 26,
    phone_detection_count: 3,
    high_risk_candidates: 2,
    review_required_reports: 4,
    charts: {
      pass_vs_fail: {
        data: [33, 5] // Passed, Failed
      },
      risk_distribution: {
        low: 38,
        medium: 4,
        high: 2,
        critical: 1
      },
      violations_by_type: {
        "TAB_SWITCH": 12,
        "FACE_NOT_FOUND": 8,
        "PHONE_DETECTED": 3,
        "MULTIPLE_FACES": 2,
        "TALKING_DETECTED": 1
      },
      exam_performance: {
        "Demo Exam": 88,
        "CS101 Midterm": 74,
        "Algorithms Final": 82
      }
    },
    latest_alerts: [
      {
        violation_type: "PHONE_DETECTED",
        severity: "high",
        user_id: "candidate_demo",
        session_id: "sess_1719210045231",
        timestamp: new Date(Date.now() - 120000).toISOString()
      },
      {
        violation_type: "TAB_SWITCH",
        severity: "high",
        user_id: "candidate_demo",
        session_id: "sess_1719210045231",
        timestamp: new Date(Date.now() - 300000).toISOString()
      },
      {
        violation_type: "FACE_NOT_FOUND",
        severity: "medium",
        user_id: "student_demo",
        session_id: "sess_1719211029104",
        timestamp: new Date(Date.now() - 600000).toISOString()
      }
    ]
  };

  const mockCandidates = [
    {
      id: 1,
      user_id: "candidate_demo",
      name: "Jane Doe",
      email: "candidate@omniverifyx.ai",
      category: "BC-A",
      annual_income: 85000,
      aadhaar_match: "MATCH",
      name_match_score: 98,
      aadhaar_verification_status: "PASS",
      status: "VERIFIED"
    },
    {
      id: 2,
      user_id: "student_demo",
      name: "John Smith",
      email: "student@omniverifyx.ai",
      category: "OC",
      annual_income: 2500000,
      aadhaar_match: "MATCH",
      name_match_score: 95,
      aadhaar_verification_status: "PASS",
      status: "VERIFIED"
    }
  ];

  const mockSessions = [
    {
      session_id: "sess_1719210045231",
      candidate_uuid: "candidate-uuid-222",
      login_time: new Date(Date.now() - 3600000).toISOString(),
      logout_time: new Date(Date.now() - 3000000).toISOString(),
      duration_seconds: 600,
      exam_status: "completed",
      face_similarity: 0.9412,
      blink_count: 24
    }
  ];

  const mockViolations = [
    {
      violation_type: "PHONE_DETECTED",
      severity: "high",
      timestamp: new Date(Date.now() - 3400000).toISOString(),
      session_id: "sess_1719210045231"
    },
    {
      violation_type: "TAB_SWITCH",
      severity: "high",
      timestamp: new Date(Date.now() - 3200000).toISOString(),
      session_id: "sess_1719210045231"
    }
  ];

  useEffect(() => {
    // Auth Guard
    const role = localStorage.getItem("user_role") || localStorage.getItem("admin_role");
    const loggedIn = localStorage.getItem("logged_in") === "true" || localStorage.getItem("admin_logged_in") === "true";
    
    if (!loggedIn || role !== "admin") {
      navigate("/login");
      return;
    }

    fetchDashboard();
    fetchCandidates();
  }, [navigate]);

  const fetchCandidates = async () => {
    try {
      const response = await axios.get("/users/");
      setCandidates(response.data || []);
    } catch (error) {
      console.warn("Backend candidates list connection failed, loading mock list...", error);
      setCandidates(mockCandidates);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await axios.get("/exam/admin/dashboard");
      if (response.data && response.data.dashboard) {
        setDashboard(response.data.dashboard);
      } else {
        setDashboard(mockDashboard);
      }
    } catch (error) {
      console.warn("Backend admin metrics connection failed, loading mock dashboard...", error);
      setIsDemoMode(true);
      setDashboard(mockDashboard);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const loadCandidateData = async () => {
    if (!searchUserId.trim()) {
      alert("Please enter a Candidate Hall Ticket Number");
      return;
    }

    setLoadingData(true);
    setSearchError("");
    setSessions([]);
    setViolations([]);

    try {
      const [sessionsRes, violationsRes] = await Promise.all([
        axios.get(`/exam/sessions/${searchUserId.trim()}`),
        axios.get(`/proctoring/user/${searchUserId.trim()}`)
      ]);

      if (sessionsRes.data.success && sessionsRes.data.sessions?.length > 0) {
        setSessions(sessionsRes.data.sessions || []);
      } else if (searchUserId.trim() === "candidate_demo" || searchUserId.trim() === "student_demo") {
        setSessions(mockSessions);
      } else {
        setSearchError("No sessions found for this ID.");
      }

      if (violationsRes.data.success && violationsRes.data.logs?.length > 0) {
        setViolations(violationsRes.data.logs || []);
      } else if (searchUserId.trim() === "candidate_demo") {
        setViolations(mockViolations);
      }
    } catch (error) {
      console.warn("Backend candidate lookups failed, loading mock session details...", error);
      if (searchUserId.trim() === "candidate_demo" || searchUserId.trim() === "student_demo") {
        setSessions(mockSessions);
        if (searchUserId.trim() === "candidate_demo") {
          setViolations(mockViolations);
        }
      } else {
        setSearchError("Candidate ID not found in database.");
      }
    } finally {
      setLoadingData(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return "N/A";
    return new Date(value).toLocaleString();
  };

  const formatDuration = (seconds) => {
    if (seconds === undefined || seconds === null) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} min ${secs} sec`;
  };

  const COLORS = ["#10b981", "#ef4444"];
  const RISK_COLORS = ["#10b981", "#f59e0b", "#ef4444", "#7f1d1d"];

  const hasAnalyticsData = dashboard && (
    (dashboard.active_sessions || 0) > 0 ||
    (dashboard.completed_exams || 0) > 0 ||
    (dashboard.total_violations || 0) > 0 ||
    (dashboard.review_required_reports || 0) > 0 ||
    isDemoMode
  );

  const passVsFailData = dashboard?.charts?.pass_vs_fail ? [
    { name: "Passed", value: dashboard.charts.pass_vs_fail.data[0] },
    { name: "Failed", value: dashboard.charts.pass_vs_fail.data[1] }
  ] : [];

  const riskDistributionData = dashboard?.charts?.risk_distribution ? [
    { name: "Low", value: dashboard.charts.risk_distribution.low },
    { name: "Medium", value: dashboard.charts.risk_distribution.medium },
    { name: "High", value: dashboard.charts.risk_distribution.high },
    { name: "Critical", value: dashboard.charts.risk_distribution.critical }
  ] : [];

  const violationsByTypeData = dashboard?.charts?.violations_by_type ? 
    Object.entries(dashboard.charts.violations_by_type).map(([name, value]) => ({
      name,
      value
    })) : [];

  const examPerformanceData = dashboard?.charts?.exam_performance ? 
    Object.entries(dashboard.charts.exam_performance).map(([name, value]) => ({
      name,
      value
    })) : [];

  if (loading) {
    return (
      <div className="container" style={{ textAlign: "center", padding: "100px 0" }}>
        <div className="spinner" style={{ margin: "0 auto 20px" }}></div>
        <h2>Loading Admin Dashboard...</h2>
      </div>
    );
  }

  return (
    <>
      {(isDemoMode || localStorage.getItem("demo_mode_active") === "true") && (
        <div className="demo-banner">
          <span>⚠️</span>
          <strong>Demo Mode Active: Offline Analytics Engines Enabled</strong>
        </div>
      )}

      <div className="navbar">
        <h2>OmniVerifyX AI Admin</h2>
        <div>
          <Link to="/admin/dashboard" className="active-link">Dashboard</Link>
          <Link to="/admin/exams">Exams</Link>
          <Link to="/admin/hall-tickets">Hall Tickets</Link>
          <Link to="/admin/live-monitoring">Live Monitoring</Link>
          <Link to="/admin/verify-docs">Verify Docs</Link>
          <Link to="/admin/proctoring-logs">Proctoring Logs</Link>
          <button onClick={handleLogout} style={{ backgroundColor: "#dc3545", padding: "6px 14px", fontSize: "0.85em" }}>
            Logout
          </button>
        </div>
      </div>

      <div className="container" style={{ maxWidth: "1200px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "15px", marginBottom: "30px" }}>
          <div>
            <h1>Admin Portal Dashboard</h1>
            <p className="subtitle" style={{ margin: 0 }}>Overview of applications, biometric validation checklist, and YOLO proctor metrics.</p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link to="/admin/exams"><button style={{ backgroundColor: "var(--indigo)" }}>Exams Management</button></Link>
            <Link to="/admin/hall-tickets"><button style={{ backgroundColor: "#fd7e14" }}>Hall Tickets Desk</button></Link>
          </div>
        </div>

        {/* Statistics Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "35px" }}>
          <div className="card" style={{ borderLeft: "4px solid var(--primary-color)" }}>
            <h3 style={{ margin: "0 0 5px 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>Total Applications</h3>
            <h1 style={{ fontSize: "2rem", margin: 0 }}>{dashboard?.total_candidates}</h1>
          </div>
          <div className="card" style={{ borderLeft: "4px solid var(--warning)" }}>
            <h3 style={{ margin: "0 0 5px 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>Pending Reviews</h3>
            <h1 style={{ fontSize: "2rem", margin: 0, color: "var(--warning)" }}>{dashboard?.review_required_reports}</h1>
          </div>
          <div className="card" style={{ borderLeft: "4px solid var(--success)" }}>
            <h3 style={{ margin: "0 0 5px 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>Approved Candidates</h3>
            <h1 style={{ fontSize: "2rem", margin: 0, color: "var(--success)" }}>{dashboard?.total_candidates - (dashboard?.review_required_reports || 0)}</h1>
          </div>
          <div className="card" style={{ borderLeft: "4px solid var(--indigo)" }}>
            <h3 style={{ margin: "0 0 5px 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>Exams Created</h3>
            <h1 style={{ fontSize: "2rem", margin: 0 }}>{dashboard?.total_exams || 0}</h1>
          </div>
          <div className="card" style={{ borderLeft: "4px solid var(--danger)" }}>
            <h3 style={{ margin: "0 0 5px 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>Verification Logs</h3>
            <h1 style={{ fontSize: "2rem", margin: 0, color: "var(--danger)" }}>{dashboard?.total_violations}</h1>
          </div>
        </div>

        {/* Chart Analytics Visualization */}
        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ marginBottom: "20px", fontSize: "1.5rem" }}>Exam Operations Analytics</h2>
          {!hasAnalyticsData ? (
            <div className="card" style={{ width: "100%", padding: "50px", textAlign: "center" }}>
              <p style={{ color: "#64748b" }}>No analytics metrics compiled yet.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "25px" }}>
              {/* Chart 1: Pass vs Fail */}
              <div className="card" style={{ width: "100%", height: "350px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: "1rem", color: "#0f172a", marginBottom: "15px", textAlign: "center" }}>Pass vs Fail Breakdown</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={passVsFailData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}
                      dataKey="value"
                    >
                      {passVsFailData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Chart 2: Risk Distribution */}
              <div className="card" style={{ width: "100%", height: "350px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: "1rem", color: "#0f172a", marginBottom: "15px", textAlign: "center" }}>Risk Level Distribution</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={riskDistributionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#4f46e5" name="Candidates">
                      {riskDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={RISK_COLORS[index % RISK_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Chart 3: Violations Type */}
              <div className="card" style={{ width: "100%", height: "350px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: "1rem", color: "#0f172a", marginBottom: "15px", textAlign: "center" }}>Violations Tracked by Category</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={violationsByTypeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#ef4444" name="Alert Count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Chart 4: Exam Performance */}
              <div className="card" style={{ width: "100%", height: "350px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: "1rem", color: "#0f172a", marginBottom: "15px", textAlign: "center" }}>Average Exam Scores (%)</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={examPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#2563eb" name="Score (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Latest Alerts */}
        <div className="form-card" style={{ maxWidth: "100%", margin: "0 0 40px 0" }}>
          <h2>Latest Proctoring Alerts</h2>
          {dashboard?.latest_alerts?.length === 0 ? (
            <p>No proctoring violations recorded.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Violation Category</th>
                    <th>Severity</th>
                    <th>Hall Ticket Number</th>
                    <th>Session ID</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard?.latest_alerts?.map((alert, idx) => {
                    const isHigh = alert.severity === "high" || alert.severity === "critical";
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: "600", color: isHigh ? "var(--danger)" : "var(--text-primary)" }}>{alert.violation_type}</td>
                        <td>
                          <span className={`status-badge ${alert.severity === "critical" ? "critical" : isHigh ? "fail" : "pending"}`}>
                            {alert.severity}
                          </span>
                        </td>
                        <td>{alert.user_id}</td>
                        <td style={{ fontFamily: "monospace", fontSize: "0.85em" }}>{alert.session_id}</td>
                        <td>{formatDate(alert.timestamp)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Document Verification Grid */}
        <div className="form-card" style={{ maxWidth: "100%", margin: "0 0 40px 0" }}>
          <h2>Candidate Onboarding Document Audits</h2>
          {loadingCandidates ? (
            <p>Loading documents checklist...</p>
          ) : candidates.length === 0 ? (
            <p>No candidates found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Candidate Details</th>
                    <th>Aadhaar OCR Check</th>
                    <th>Name Match Accuracy</th>
                    <th>Eligibility Scanner</th>
                    <th>Final Status</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((cand) => (
                    <tr key={cand.id}>
                      <td>
                        <strong>{cand.name}</strong>
                        <div style={{ fontSize: "0.8rem", color: "#64748b" }}>ID: {cand.user_id}</div>
                        <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{cand.category} | Annual: ₹{cand.annual_income?.toLocaleString("en-IN")}</div>
                      </td>
                      <td style={{ fontWeight: "600" }}>{cand.aadhaar_match || "PENDING"}</td>
                      <td style={{ fontWeight: "500" }}>{cand.name_match_score !== null ? `${cand.name_match_score}%` : "N/A"}</td>
                      <td>
                        <span className={`status-badge ${cand.aadhaar_verification_status === "PASS" ? "pass" : cand.aadhaar_verification_status === "MANUAL_REVIEW" ? "review" : "fail"}`}>
                          {cand.aadhaar_verification_status || "NOT_UPLOADED"}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${cand.status === "VERIFIED" || cand.status === "PASS" ? "pass" : "fail"}`}>
                          {cand.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Lookup Candidate Sessions */}
        <div className="form-card" style={{ maxWidth: "100%", margin: 0 }}>
          <h2>Session Logs & Audits Lookup</h2>
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px", alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="lookup-id-input" style={{ marginTop: 0 }}>Hall Ticket Number</label>
              <input
                id="lookup-id-input"
                type="text"
                placeholder="Enter candidate Hall Ticket (e.g. candidate_demo)"
                value={searchUserId}
                onChange={(e) => setSearchUserId(e.target.value)}
                style={{ margin: 0 }}
              />
            </div>
            <button onClick={loadCandidateData} disabled={loadingData}>
              {loadingData ? "Searching..." : "Search Candidate Sessions"}
            </button>
          </div>

          {searchError && (
            <div className="error" style={{ marginBottom: "20px" }}>
              <span>⚠️</span>
              <div>{searchError}</div>
            </div>
          )}

          {/* Sessions Result */}
          {sessions.length > 0 && (
            <div style={{ marginTop: "20px" }}>
              <h3>Exam Sessions List</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Session ID</th>
                      <th>Login Time</th>
                      <th>Logout Time</th>
                      <th>Duration</th>
                      <th>Exit Status</th>
                      <th>Face Similarity</th>
                      <th>Blinks Checked</th>
                      <th>Report</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((sess) => (
                      <tr key={sess.session_id}>
                        <td style={{ fontFamily: "monospace", fontSize: "0.85em" }}>{sess.session_id.substring(0, 12)}...</td>
                        <td>{formatDate(sess.login_time)}</td>
                        <td>{formatDate(sess.logout_time)}</td>
                        <td>{formatDuration(sess.duration_seconds)}</td>
                        <td>
                          <span className={`status-badge ${sess.exam_status === "completed" ? "pass" : "pending"}`}>
                            {sess.exam_status}
                          </span>
                        </td>
                        <td>{sess.face_similarity ? sess.face_similarity.toFixed(4) : "N/A"}</td>
                        <td>{sess.blink_count ?? "N/A"}</td>
                        <td>
                          <Link to={`/report/${sess.session_id}`}>
                            <button style={{ padding: "5px 10px", fontSize: "0.8em" }}>View report</button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Violations Result */}
          {violations.length > 0 && (
            <div style={{ marginTop: "30px" }}>
              <h3>Proctor violations Checked</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Violation Category</th>
                      <th>Severity</th>
                      <th>Timestamp</th>
                      <th>Session ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {violations.map((viol, index) => (
                      <tr key={index}>
                        <td style={{ fontWeight: "600", color: "var(--danger)" }}>{viol.violation_type}</td>
                        <td>
                          <span className={`status-badge ${viol.severity === "high" || viol.severity === "critical" ? "fail" : "pending"}`}>
                            {viol.severity}
                          </span>
                        </td>
                        <td>{formatDate(viol.timestamp)}</td>
                        <td style={{ fontFamily: "monospace", fontSize: "0.85em" }}>{viol.session_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default AdminDashboard;