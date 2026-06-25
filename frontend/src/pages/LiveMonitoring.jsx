import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

function LiveMonitoring() {
    const navigate = useNavigate();

    const [sessions, setSessions] = useState([]);
    const [summary, setSummary] = useState({
        active_count: 0,
        low_risk: 0,
        medium_risk: 0,
        high_risk: 0,
        critical_risk: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isDemoMode, setIsDemoMode] = useState(false);

    // Mock Live Monitoring Data
    const mockSessions = [
        {
            candidate_name: "Jane Doe",
            hall_ticket_number: "candidate_demo",
            session_id: "sess_1719210045231",
            exam_name: "OmniVerifyX AI Demo Exam",
            time_remaining: "07:45",
            time_remaining_seconds: 465,
            face_verification_status: "MATCH",
            voice_verification_status: "MATCH",
            liveness_status: "LIVE",
            risk_score: 45,
            risk_level: "medium",
            latest_violation: "TAB_SWITCH",
            total_violations: 2
        },
        {
            candidate_name: "John Smith",
            hall_ticket_number: "student_demo",
            session_id: "sess_1719211029104",
            exam_name: "Introduction to Computer Science Mid-Term",
            time_remaining: "54:12",
            time_remaining_seconds: 3252,
            face_verification_status: "MATCH",
            voice_verification_status: "MATCH",
            liveness_status: "LIVE",
            risk_score: 5,
            risk_level: "low",
            latest_violation: "None",
            total_violations: 0
        }
    ];

    const mockSummary = {
        active_count: 2,
        low_risk: 1,
        medium_risk: 1,
        high_risk: 0,
        critical_risk: 0
    };

    const fetchLiveMonitoring = async () => {
        try {
            const res = await axios.get("/exam/admin/live-monitoring");
            if (res.data.success) {
                setSessions(res.data.active_sessions || []);
                setSummary(res.data.summary || mockSummary);
                setError("");
            }
        } catch (err) {
            console.warn("Backend live proctor connection failed, loading mock live monitor details...", err);
            setIsDemoMode(true);
            setSessions(mockSessions);
            setSummary(mockSummary);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Auth Guard
        const role = localStorage.getItem("user_role") || localStorage.getItem("admin_role");
        const loggedIn = localStorage.getItem("logged_in") === "true" || localStorage.getItem("admin_logged_in") === "true";
        if (!loggedIn || role !== "admin") {
            navigate("/login");
            return;
        }

        fetchLiveMonitoring();
        const interval = setInterval(fetchLiveMonitoring, 5000);
        return () => clearInterval(interval);
    }, [navigate]);

    const getRiskStyleClass = (level) => {
        switch (level?.toLowerCase()) {
            case "low":
                return "status-badge pass";
            case "medium":
                return "status-badge pending";
            case "high":
                return "status-badge fail";
            case "critical":
            default:
                return "status-badge critical";
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    return (
        <>
            {(isDemoMode || localStorage.getItem("demo_mode_active") === "true") && (
                <div className="demo-banner">
                    <span>⚠️</span>
                    <strong>Demo Mode Active: Offline Live Proctor Feeds Enabled</strong>
                </div>
            )}

            <div className="navbar">
                <h2>OmniVerifyX AI Admin</h2>
                <div>
                    <Link to="/admin/dashboard">Dashboard</Link>
                    <Link to="/admin/exams">Exams</Link>
                    <Link to="/admin/hall-tickets">Hall Tickets</Link>
                    <Link to="/admin/live-monitoring" className="active-link">Live Monitoring</Link>
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
                        <h1>Live Exam Monitoring Panel</h1>
                        <p className="subtitle" style={{ margin: 0 }}>Real-time candidate webcams and proctor logs (Auto-refreshing every 5s).</p>
                    </div>
                    <Link to="/admin/dashboard">
                        <button style={{ backgroundColor: "#64748b" }}>Back to Dashboard</button>
                    </Link>
                </div>

                {error && <div className="error" style={{ marginBottom: "20px" }}>{error}</div>}

                {/* Summary Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "20px", marginBottom: "30px" }}>
                    <div className="card" style={{ borderLeft: "5px solid #2563eb" }}>
                        <h3 style={{ margin: "0 0 5px 0", fontSize: "0.85rem", color: "#64748b" }}>Active Sessions</h3>
                        <h1 style={{ margin: 0, fontSize: "2rem" }}>{summary.active_count}</h1>
                    </div>
                    <div className="card" style={{ borderLeft: "5px solid #10b981" }}>
                        <h3 style={{ margin: "0 0 5px 0", fontSize: "0.85rem", color: "#64748b" }}>Low Risk</h3>
                        <h1 style={{ margin: 0, fontSize: "2rem", color: "#10b981" }}>{summary.low_risk}</h1>
                    </div>
                    <div className="card" style={{ borderLeft: "5px solid #f59e0b" }}>
                        <h3 style={{ margin: "0 0 5px 0", fontSize: "0.85rem", color: "#64748b" }}>Medium Risk</h3>
                        <h1 style={{ margin: 0, fontSize: "2rem", color: "#f59e0b" }}>{summary.medium_risk}</h1>
                    </div>
                    <div className="card" style={{ borderLeft: "5px solid #ef4444" }}>
                        <h3 style={{ margin: "0 0 5px 0", fontSize: "0.85rem", color: "#64748b" }}>High Risk</h3>
                        <h1 style={{ margin: 0, fontSize: "2rem", color: "#ef4444" }}>{summary.high_risk}</h1>
                    </div>
                    <div className="card" style={{ borderLeft: "5px solid #7f1d1d" }}>
                        <h3 style={{ margin: "0 0 5px 0", fontSize: "0.85rem", color: "#64748b" }}>Critical Risk</h3>
                        <h1 style={{ margin: 0, fontSize: "2rem", color: "#7f1d1d" }}>{summary.critical_risk}</h1>
                    </div>
                </div>

                {/* Active Sessions Grid */}
                <div className="form-card" style={{ maxWidth: "100%", margin: 0, padding: "24px" }}>
                    <h2>Active Candidate Sessions</h2>
                    {loading ? (
                        <div style={{ padding: "30px 0", textAlign: "center" }}>
                            <div className="spinner" style={{ margin: "0 auto 10px" }}></div>
                            <p>Loading candidate feeds...</p>
                        </div>
                    ) : sessions.length === 0 ? (
                        <p style={{ color: "#64748b", padding: "20px 0" }}>No candidates are currently active in exam windows.</p>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%" }}>
                                <thead>
                                    <tr>
                                        <th>Candidate</th>
                                        <th>Hall Ticket</th>
                                        <th>Exam / Session</th>
                                        <th>Time Remaining</th>
                                        <th>Verification Profile</th>
                                        <th>Risk Score</th>
                                        <th>Risk level</th>
                                        <th>Latest Violation</th>
                                        <th>Logs</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.map((session, index) => {
                                        return (
                                            <tr key={index}>
                                                <td>
                                                    <strong>{session.candidate_name}</strong>
                                                </td>
                                                <td>
                                                    <strong style={{ color: "var(--primary-color)" }}>{session.hall_ticket_number}</strong>
                                                </td>
                                                <td style={{ fontSize: "0.85rem" }}>
                                                    <strong>{session.exam_name}</strong>
                                                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontFamily: "monospace" }}>
                                                        {session.session_id?.substring(0, 12)}...
                                                    </div>
                                                </td>
                                                <td style={{ color: session.time_remaining_seconds < 60 ? "var(--danger)" : "var(--text-primary)", fontWeight: "700" }}>
                                                    {session.time_remaining}
                                                </td>
                                                <td style={{ fontSize: "0.8rem", lineHeight: "1.4" }}>
                                                    <div style={{ color: "var(--success)", fontWeight: "600" }}>Face: {session.face_verification_status || "MATCH"}</div>
                                                    <div style={{ color: "var(--primary-color)", fontWeight: "600" }}>Voice: {session.voice_verification_status || "MATCH"}</div>
                                                    <div style={{ color: "var(--indigo)", fontWeight: "600" }}>Live: {session.liveness_status || "LIVE"}</div>
                                                </td>
                                                <td style={{ fontWeight: "700", color: "#0f172a" }}>{session.risk_score}%</td>
                                                <td>
                                                    <span className={getRiskStyleClass(session.risk_level)}>
                                                        {session.risk_level}
                                                    </span>
                                                </td>
                                                <td style={{ color: "var(--danger)", fontWeight: "700", fontSize: "0.85rem" }}>
                                                    {session.latest_violation || "None"}
                                                </td>
                                                <td>
                                                    <span className={`status-badge ${session.total_violations > 0 ? "fail" : "pass"}`}>
                                                        {session.total_violations} alert(s)
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        onClick={() => navigate(`/report/${session.session_id}`)}
                                                        style={{ padding: "6px 12px", fontSize: "0.8rem", backgroundColor: "var(--primary-color)" }}
                                                    >
                                                        Review Session
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default LiveMonitoring;
