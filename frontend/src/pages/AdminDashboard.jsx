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
  LineChart,
  Line,
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

    useEffect(() => {
        fetchDashboard();
        fetchCandidates();
    }, []);

    const fetchCandidates = async () => {
        try {
            const response = await axios.get("/users/");
            setCandidates(response.data || []);
        } catch (error) {
            console.error("Candidates Fetch Error:", error);
        } finally {
            setLoadingCandidates(false);
        }
    };

    const fetchDashboard = async () => {
        try {
            const response = await axios.get("/exam/admin/dashboard");

            setDashboard(response.data.dashboard);
        } catch (error) {
            console.error("Dashboard Error:", error);
        }

        setLoading(false);
    };

    const handleLogout = () => {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_role");
        localStorage.removeItem("admin_logged_in");
        navigate("/admin/login");
    };

    const loadCandidateData = async () => {
        if (!searchUserId.trim()) {
            alert("Please enter a User ID");
            return;
        }

        setLoadingData(true);
        setSearchError("");

        try {
            const [sessionsRes, violationsRes] = await Promise.all([
                axios.get(`/exam/sessions/${searchUserId.trim()}`),
                axios.get(`/proctoring/user/${searchUserId.trim()}`)
            ]);

            if (sessionsRes.data.success) {
                setSessions(sessionsRes.data.sessions || []);
            } else {
                setSessions([]);
            }

            if (violationsRes.data.success) {
                setViolations(violationsRes.data.logs || []);
            } else {
                setViolations([]);
            }
        } catch (error) {
            console.error("Error loading candidate data:", error);
            setSearchError("Failed to load data for the specified User ID");
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

    const COLORS = ["#dc3545", "#3b82f6"];

    const hasAnalyticsData = dashboard && (
        (dashboard.active_sessions || 0) > 0 ||
        (dashboard.completed_exams || 0) > 0 ||
        (dashboard.total_violations || 0) > 0 ||
        (dashboard.review_required_reports || 0) > 0
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
            <div className="container">
                <h2>Loading Dashboard...</h2>
            </div>
        );
    }

    return (
        <>
            <div className="navbar">
                <h2>OmniVerifyX AI Admin</h2>

                <div>
                    <Link to="/">Home</Link>
                    <Link to="/enroll">Enroll</Link>
                    <Link to="/verify">Verify</Link>
                    <Link to="/admin">Admin</Link>
                    <Link to="/admin/exams">Exams</Link>
                </div>
            </div>

            <div className="container">
                {/* Welcome Admin Header with Nav controls */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", paddingBottom: "15px", marginBottom: "20px" }}>
                    <div>
                        <h1 style={{ margin: 0 }}>Welcome Admin</h1>
                        <p className="subtitle" style={{ margin: "5px 0 0 0" }}>Live Exam Monitoring & Analytics</p>
                    </div>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <Link to="/admin/exams"><button style={{ padding: "8px 12px", fontSize: "0.9em", backgroundColor: "#007bff" }}>Manage Exams</button></Link>
                        <Link to="/admin/hall-tickets"><button style={{ padding: "8px 12px", fontSize: "0.9em", backgroundColor: "#28a745" }}>Manage Hall Tickets</button></Link>
                        <Link to="/admin/live-monitoring"><button style={{ padding: "8px 12px", fontSize: "0.9em", backgroundColor: "#fd7e14" }}>Live Monitoring</button></Link>
                        <a href="#metrics"><button style={{ padding: "8px 12px", fontSize: "0.9em" }}>Dashboard</button></a>
                        <a href="#document-summary-section"><button style={{ padding: "8px 12px", fontSize: "0.9em", backgroundColor: "#aa3bff" }}>Doc Summary</button></a>
                        <a href="#lookup"><button style={{ padding: "8px 12px", fontSize: "0.9em" }}>Candidate Sessions</button></a>
                        <a href="#violations-section"><button style={{ padding: "8px 12px", fontSize: "0.9em" }}>Violations</button></a>
                        <a href="#lookup"><button style={{ padding: "8px 12px", fontSize: "0.9em" }}>Reports</button></a>
                        <button onClick={handleLogout} style={{ padding: "8px 12px", fontSize: "0.9em", backgroundColor: "#dc3545" }}>Logout</button>
                    </div>
                </div>

                <div id="metrics" style={{ marginTop: "10px" }}>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
                            gap: "20px"
                        }}
                    >
                        <div className="card">
                            <h3>Total Candidates</h3>
                            <h1>{dashboard?.total_candidates}</h1>
                        </div>

                        <div className="card">
                            <h3>Total Exams</h3>
                            <h1>{dashboard?.total_exams || 0}</h1>
                        </div>

                        <div className="card">
                            <h3>Active Sessions</h3>
                            <h1>{dashboard?.active_sessions}</h1>
                        </div>

                        <div className="card">
                            <h3>Completed Exams</h3>
                            <h1>{dashboard?.completed_exams}</h1>
                        </div>

                        <div className="card">
                            <h3>Pass Rate</h3>
                            <h1 style={{ color: "#28a745" }}>{dashboard?.pass_rate !== undefined ? `${dashboard.pass_rate}%` : "0%"}</h1>
                        </div>

                        <div className="card">
                            <h3>Average Exam Score</h3>
                            <h1>{dashboard?.average_score !== undefined ? `${dashboard.average_score}%` : "0%"}</h1>
                        </div>

                        <div className="card">
                            <h3>Average Risk Score</h3>
                            <h1 style={{ color: dashboard?.average_risk_score > 50 ? "#dc3545" : "#111827" }}>{dashboard?.average_risk_score !== undefined ? dashboard.average_risk_score : "0"}</h1>
                        </div>

                        <div className="card">
                            <h3>Total Violations</h3>
                            <h1>{dashboard?.total_violations}</h1>
                        </div>

                        <div className="card">
                            <h3>Phone Detections</h3>
                            <h1 style={{ color: "#dc3545" }}>{dashboard?.phone_detection_count || 0}</h1>
                        </div>

                        <div className="card">
                            <h3>High Risk Candidates</h3>
                            <h1 style={{ color: "#721c24" }}>{dashboard?.high_risk_candidates || 0}</h1>
                        </div>

                        <div className="card">
                            <h3>Review Required</h3>
                            <h1>{dashboard?.review_required_reports}</h1>
                        </div>
                    </div>
                </div>

                {/* Analytics Section */}
                <div style={{ marginTop: "30px", textAlign: "left" }}>
                    <h2>Analytics & Visualization</h2>
                    {!hasAnalyticsData ? (
                        <div className="card" style={{ width: "100%", padding: "40px", textAlign: "center" }}>
                            <p style={{ color: "#6b7280", fontWeight: "bold" }}>No analytics data available yet.</p>
                        </div>
                    ) : (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                                gap: "20px",
                                marginTop: "15px"
                            }}
                        >
                            <div className="card" style={{ width: "100%", minHeight: "350px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                                <h3 style={{ margin: "0 0 15px 0", textAlign: "center", fontSize: "1.1em" }}>Pass vs Fail</h3>
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie
                                            data={passVsFailData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, value }) => value > 0 ? `${name}: ${value}` : ""}
                                            outerRadius={75}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            <Cell fill="#28a745" />
                                            <Cell fill="#dc3545" />
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="card" style={{ width: "100%", minHeight: "350px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                                <h3 style={{ margin: "0 0 15px 0", textAlign: "center", fontSize: "1.1em" }}>Risk Distribution</h3>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={riskDistributionData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="value" name="Candidates">
                                            <Cell fill="#28a745" />
                                            <Cell fill="#fd7e14" />
                                            <Cell fill="#dc3545" />
                                            <Cell fill="#721c24" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="card" style={{ width: "100%", minHeight: "350px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                                <h3 style={{ margin: "0 0 15px 0", textAlign: "center", fontSize: "1.1em" }}>Violations by Type</h3>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={violationsByTypeData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="value" name="Count" fill="#fd7e14" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="card" style={{ width: "100%", minHeight: "350px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                                <h3 style={{ margin: "0 0 15px 0", textAlign: "center", fontSize: "1.1em" }}>Exam Performance (Avg %)</h3>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={examPerformanceData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis domain={[0, 100]} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="value" name="Average %" fill="#3b82f6" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>

                {/* Latest Alerts Section */}
                <div className="form-card" style={{ marginTop: "30px" }}>
                    <h2>Latest Proctoring Alerts</h2>
                    {!dashboard?.latest_alerts || dashboard.latest_alerts.length === 0 ? (
                        <p>No proctoring alerts recorded.</p>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
                                <thead>
                                    <tr style={{ borderBottom: "2px solid #ccc", textAlign: "left" }}>
                                        <th style={{ padding: "8px" }}>Violation Type</th>
                                        <th style={{ padding: "8px" }}>Severity</th>
                                        <th style={{ padding: "8px" }}>Hall Ticket Number</th>
                                        <th style={{ padding: "8px" }}>Session ID</th>
                                        <th style={{ padding: "8px" }}>Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dashboard.latest_alerts.map((alert, index) => {
                                        const isHighOrCritical = alert.severity === "high" || alert.severity === "critical";
                                        return (
                                            <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                                                <td style={{ 
                                                    padding: "8px", 
                                                    fontSize: "0.9em", 
                                                    color: isHighOrCritical ? "#dc3545" : "#212529",
                                                    fontWeight: isHighOrCritical ? "bold" : "normal"
                                                }}>
                                                    {alert.violation_type}
                                                </td>
                                                <td style={{ padding: "8px", fontSize: "0.9em" }}>
                                                    <span style={{
                                                        padding: "2px 6px",
                                                        borderRadius: "4px",
                                                        backgroundColor: isHighOrCritical ? "#ffd2d2" : "#fff3cd",
                                                        color: isHighOrCritical ? "#dc3545" : "#856404",
                                                        fontWeight: "bold",
                                                        textTransform: "capitalize"
                                                    }}>
                                                        {alert.severity}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "8px", fontSize: "0.9em" }}>{alert.user_id}</td>
                                                <td style={{ padding: "8px", fontSize: "0.9em", fontFamily: "monospace" }}>{alert.session_id}</td>
                                                <td style={{ padding: "8px", fontSize: "0.9em" }}>{formatDate(alert.timestamp)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Document Verification Summary Section */}
                <div id="document-summary-section" className="form-card" style={{ marginTop: "30px", maxWidth: "100%", textAlign: "left" }}>
                    <h2>Document Verification Summary</h2>
                    <p className="subtitle" style={{ marginBottom: "20px" }}>Monitor candidate document compliance, OCR statuses, and requirements based on eligibility rules.</p>
                    
                    {loadingCandidates ? (
                        <p>Loading document verification data...</p>
                    ) : candidates.length === 0 ? (
                        <p>No candidates found.</p>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
                                <thead>
                                    <tr style={{ borderBottom: "2px solid #ccc", textAlign: "left" }}>
                                        <th style={{ padding: "12px 8px" }}>Candidate</th>
                                        <th style={{ padding: "12px 8px" }}>Aadhaar Match</th>
                                        <th style={{ padding: "12px 8px" }}>Name Match Score</th>
                                        <th style={{ padding: "12px 8px" }}>Verification Status</th>
                                        <th style={{ padding: "12px 8px" }}>Overall Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {candidates.map((cand) => (
                                        <tr key={cand.id} style={{ borderBottom: "1px solid #eee" }}>
                                            <td style={{ padding: "12px 8px", fontSize: "0.9em" }}>
                                                <strong>{cand.name}</strong>
                                                <div style={{ fontSize: "0.85em", color: "#666" }}>ID: {cand.user_id}</div>
                                                <div style={{ fontSize: "0.85em", color: "#666" }}>Category: {cand.category} | Income: ₹{cand.annual_income?.toLocaleString("en-IN")}</div>
                                            </td>
                                            <td style={{ padding: "12px 8px", fontSize: "0.9em", fontWeight: "bold" }}>
                                                <span style={{
                                                    color: cand.aadhaar_match === "MATCH" ? "#16a34a" : (cand.aadhaar_match === "MISMATCH" ? "#dc2626" : "#666")
                                                }}>
                                                    {cand.aadhaar_match || "NOT_PROVIDED"}
                                                </span>
                                            </td>
                                            <td style={{ padding: "12px 8px", fontSize: "0.9em", fontWeight: "500" }}>
                                                {cand.name_match_score !== null && cand.name_match_score !== undefined ? (
                                                    `${cand.name_match_score}%`
                                                ) : (
                                                    <span style={{ color: "#666", fontStyle: "italic" }}>N/A</span>
                                                )}
                                            </td>
                                            <td style={{ padding: "12px 8px", fontSize: "0.9em" }}>
                                                <span style={{
                                                    padding: "3px 8px",
                                                    borderRadius: "4px",
                                                    fontSize: "0.85em",
                                                    fontWeight: "bold",
                                                    textTransform: "capitalize",
                                                    backgroundColor: cand.aadhaar_verification_status === "PASS" ? "#e6fffa" : (cand.aadhaar_verification_status === "MANUAL_REVIEW" ? "#fffaf0" : (cand.aadhaar_verification_status === "NOT_UPLOADED" ? "#f1f5f9" : "#fff5f5")),
                                                    color: cand.aadhaar_verification_status === "PASS" ? "#00a389" : (cand.aadhaar_verification_status === "MANUAL_REVIEW" ? "#dd6b20" : (cand.aadhaar_verification_status === "NOT_UPLOADED" ? "#475569" : "#e53e3e")),
                                                    border: `1px solid ${cand.aadhaar_verification_status === "PASS" ? "#b2f5ea" : (cand.aadhaar_verification_status === "MANUAL_REVIEW" ? "#feebc8" : (cand.aadhaar_verification_status === "NOT_UPLOADED" ? "#cbd5e1" : "#fed7d7"))}`
                                                }}>
                                                    {cand.aadhaar_verification_status || "NOT_UPLOADED"}
                                                </span>
                                            </td>
                                            <td style={{ padding: "12px 8px", fontSize: "0.9em" }}>
                                                <span style={{
                                                    padding: "4px 10px",
                                                    borderRadius: "12px",
                                                    fontSize: "0.85em",
                                                    fontWeight: "bold",
                                                    textTransform: "capitalize",
                                                    backgroundColor: cand.status === "VERIFIED" ? "#e6fffa" : cand.status === "OCR_FAILED" ? "#fff5f5" : "#fffaf0",
                                                    color: cand.status === "VERIFIED" ? "#00a389" : cand.status === "OCR_FAILED" ? "#e53e3e" : "#dd6b20",
                                                    border: `1px solid ${cand.status === "VERIFIED" ? "#b2f5ea" : cand.status === "OCR_FAILED" ? "#fed7d7" : "#feebc8"}`
                                                }}>
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

                <br />
                <hr />
                <br />

                {/* Candidate Search Section */}
                <div id="lookup" className="form-card">
                    <h2>Lookup Candidate Sessions & Violations</h2>
                    
                    <div style={{ display: "flex", gap: "10px", marginBottom: "15px", alignItems: "flex-end" }}>
                        <div style={{ flex: 1 }}>
                            <label htmlFor="search-user-id">Hall Ticket Number</label>
                            <input
                                id="search-user-id"
                                type="text"
                                placeholder="Enter Hall Ticket Number (e.g. candidate_123)"
                                value={searchUserId}
                                onChange={(e) => setSearchUserId(e.target.value)}
                            />
                        </div>
                        <button onClick={loadCandidateData} disabled={loadingData}>
                            {loadingData ? "Loading..." : "Load Candidate Sessions"}
                        </button>
                    </div>

                    {searchError && (
                        <div className="error" style={{ marginBottom: "15px" }}>
                            {searchError}
                        </div>
                    )}
                </div>

                {/* Candidate Sessions Results */}
                {sessions.length > 0 && (
                    <div className="form-card">
                        <h2>Exam Sessions ({searchUserId})</h2>
                        {sessions[0]?.candidate_uuid && (
                            <p style={{ fontSize: "0.95em", color: "#666", marginTop: "5px", marginBottom: "15px" }}>
                                <strong>Candidate UUID:</strong> <span style={{ fontFamily: "monospace" }}>{sessions[0].candidate_uuid}</span>
                            </p>
                        )}
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
                               <thead>
                                   <tr style={{ borderBottom: "2px solid #ccc", textAlign: "left" }}>
                                       <th style={{ padding: "8px" }}>Session ID</th>
                                       <th style={{ padding: "8px" }}>Login Time</th>
                                       <th style={{ padding: "8px" }}>Logout Time</th>
                                       <th style={{ padding: "8px" }}>Duration</th>
                                       <th style={{ padding: "8px" }}>Status</th>
                                       <th style={{ padding: "8px" }}>Face Similarity</th>
                                       <th style={{ padding: "8px" }}>Blink Count</th>
                                       <th style={{ padding: "8px" }}>Action</th>
                                   </tr>
                               </thead>
                               <tbody>
                                   {sessions.map((session) => (
                                       <tr key={session.session_id} style={{ borderBottom: "1px solid #eee" }}>
                                           <td style={{ padding: "8px", fontSize: "0.9em" }}>{session.session_id}</td>
                                           <td style={{ padding: "8px", fontSize: "0.9em" }}>{formatDate(session.login_time)}</td>
                                           <td style={{ padding: "8px", fontSize: "0.9em" }}>{formatDate(session.logout_time)}</td>
                                           <td style={{ padding: "8px", fontSize: "0.9em" }}>{formatDuration(session.duration_seconds)}</td>
                                           <td style={{ padding: "8px", fontSize: "0.9em", fontWeight: "bold" }}>{session.exam_status}</td>
                                           <td style={{ padding: "8px", fontSize: "0.9em" }}>
                                               {session.face_similarity ? session.face_similarity.toFixed(4) : "N/A"}
                                           </td>
                                           <td style={{ padding: "8px", fontSize: "0.9em" }}>{session.blink_count ?? "N/A"}</td>
                                           <td style={{ padding: "8px" }}>
                                               <Link to={`/report/${session.session_id}`}>
                                                   <button style={{ padding: "5px 10px", fontSize: "0.85em" }}>
                                                       View Report
                                                   </button>
                                               </Link>
                                           </td>
                                       </tr>
                                   ))}
                               </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Recent Violations Results */}
                {violations.length > 0 && (
                    <div id="violations-section" className="form-card">
                        <h2>Recent Violations ({searchUserId})</h2>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
                               <thead>
                                   <tr style={{ borderBottom: "2px solid #ccc", textAlign: "left" }}>
                                       <th style={{ padding: "8px" }}>Violation Type</th>
                                       <th style={{ padding: "8px" }}>Severity</th>
                                       <th style={{ padding: "8px" }}>Timestamp</th>
                                       <th style={{ padding: "8px" }}>Session ID</th>
                                   </tr>
                               </thead>
                               <tbody>
                                   {violations.map((violation, index) => (
                                       <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                                           <td style={{ padding: "8px", fontSize: "0.9em", color: "#dc3545", fontWeight: "bold" }}>
                                               {violation.violation_type}
                                           </td>
                                           <td style={{ padding: "8px", fontSize: "0.9em", textTransform: "capitalize" }}>
                                               <span style={{
                                                   padding: "2px 6px",
                                                   borderRadius: "4px",
                                                   backgroundColor: violation.severity === "critical" || violation.severity === "high" ? "#ffd2d2" : "#fff3cd",
                                                   color: violation.severity === "critical" || violation.severity === "high" ? "#dc3545" : "#856404"
                                               }}>
                                                   {violation.severity}
                                               </span>
                                           </td>
                                           <td style={{ padding: "8px", fontSize: "0.9em" }}>{formatDate(violation.timestamp)}</td>
                                           <td style={{ padding: "8px", fontSize: "0.9em" }}>{violation.session_id}</td>
                                       </tr>
                                   ))}
                               </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {searchUserId.trim() && !loadingData && sessions.length === 0 && violations.length === 0 && (
                     <div className="form-card">
                         <p>No active sessions or violations found for candidate Hall Ticket Number: <strong>{searchUserId}</strong></p>
                     </div>
                )}

                <br />

                <Link to="/">
                    <button>Back Home</button>
                </Link>
            </div>
        </>
    );
}

export default AdminDashboard;