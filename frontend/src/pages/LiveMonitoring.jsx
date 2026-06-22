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

    const fetchLiveMonitoring = async () => {
        try {
            const res = await axios.get("/exam/admin/live-monitoring");
            if (res.data.success) {
                setSessions(res.data.active_sessions || []);
                setSummary(res.data.summary || {
                    active_count: 0,
                    low_risk: 0,
                    medium_risk: 0,
                    high_risk: 0,
                    critical_risk: 0
                });
                setError("");
            }
        } catch (err) {
            console.error("Live Monitoring Fetch Error:", err);
            setError("Failed to fetch live proctoring data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLiveMonitoring();

        const interval = setInterval(fetchLiveMonitoring, 5000);

        return () => clearInterval(interval);
    }, []);

    const formatDate = (value) => {
        if (!value) return "N/A";
        return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const getRiskStyle = (level) => {
        switch (level) {
            case "low":
                return { backgroundColor: "#d4edda", color: "#155724" };
            case "medium":
                return { backgroundColor: "#fff3cd", color: "#856404" };
            case "high":
                return { backgroundColor: "#f8d7da", color: "#721c24" };
            case "critical":
                return { backgroundColor: "#721c24", color: "#ffffff" };
            default:
                return { backgroundColor: "#edf2f7", color: "#4a5568" };
        }
    };

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

            <div className="container" style={{ maxWidth: "1200px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", paddingBottom: "15px", marginBottom: "20px" }}>
                    <div>
                        <h1 style={{ margin: 0 }}>Live Exam Monitoring</h1>
                        <p className="subtitle" style={{ margin: "5px 0 0 0" }}>Real-time candidate feeds & integrity tracking (Auto-refreshes every 5s)</p>
                    </div>
                    <Link to="/admin">
                        <button style={{ backgroundColor: "#6c757d" }}>Back to Dashboard</button>
                    </Link>
                </div>

                {error && <div className="error" style={{ marginBottom: "20px" }}>{error}</div>}

                {/* Summary Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "20px", marginBottom: "30px" }}>
                    <div className="card" style={{ borderLeft: "5px solid #0056b3" }}>
                        <h3 style={{ margin: "0 0 5px 0", fontSize: "0.95em", color: "#666" }}>Active Sessions</h3>
                        <h1 style={{ margin: 0, fontSize: "2.2em" }}>{summary.active_count}</h1>
                    </div>
                    <div className="card" style={{ borderLeft: "5px solid #28a745" }}>
                        <h3 style={{ margin: "0 0 5px 0", fontSize: "0.95em", color: "#666" }}>Low Risk</h3>
                        <h1 style={{ margin: 0, fontSize: "2.2em", color: "#28a745" }}>{summary.low_risk}</h1>
                    </div>
                    <div className="card" style={{ borderLeft: "5px solid #fd7e14" }}>
                        <h3 style={{ margin: "0 0 5px 0", fontSize: "0.95em", color: "#666" }}>Medium Risk</h3>
                        <h1 style={{ margin: 0, fontSize: "2.2em", color: "#fd7e14" }}>{summary.medium_risk}</h1>
                    </div>
                    <div className="card" style={{ borderLeft: "5px solid #dc3545" }}>
                        <h3 style={{ margin: "0 0 5px 0", fontSize: "0.95em", color: "#666" }}>High Risk</h3>
                        <h1 style={{ margin: 0, fontSize: "2.2em", color: "#dc3545" }}>{summary.high_risk}</h1>
                    </div>
                    <div className="card" style={{ borderLeft: "5px solid #721c24" }}>
                        <h3 style={{ margin: "0 0 5px 0", fontSize: "0.95em", color: "#666" }}>Critical Risk</h3>
                        <h1 style={{ margin: 0, fontSize: "2.2em", color: "#721c24" }}>{summary.critical_risk}</h1>
                    </div>
                </div>

                {/* Active Sessions Grid / List */}
                <div className="form-card">
                    <h2>Active Candidate Sessions</h2>
                    {loading ? (
                        <p>Loading active sessions...</p>
                    ) : sessions.length === 0 ? (
                        <p style={{ color: "#666", padding: "20px 0" }}>No candidates are currently taking exams.</p>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
                                <thead>
                                <tr style={{ borderBottom: "2px solid #ccc", textAlign: "left" }}>
                                        <th style={{ padding: "12px 10px" }}>Candidate Name</th>
                                        <th style={{ padding: "12px 10px" }}>Hall Ticket</th>
                                        <th style={{ padding: "12px 10px" }}>Exam / Session</th>
                                        <th style={{ padding: "12px 10px" }}>Time Remaining</th>
                                        <th style={{ padding: "12px 10px" }}>Face / Voice / Liveness</th>
                                        <th style={{ padding: "12px 10px" }}>Risk Score</th>
                                        <th style={{ padding: "12px 10px" }}>Risk Level</th>
                                        <th style={{ padding: "12px 10px" }}>Latest Violation</th>
                                        <th style={{ padding: "12px 10px" }}>Violations</th>
                                        <th style={{ padding: "12px 10px" }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.map((session, index) => {
                                        const badgeStyle = getRiskStyle(session.risk_level);
                                        return (
                                            <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                                                <td style={{ padding: "12px 10px", fontWeight: "bold" }}>{session.candidate_name}</td>
                                                <td style={{ padding: "12px 10px", fontWeight: "bold", color: "#0056b3" }}>
                                                    {session.hall_ticket_number}
                                                </td>
                                                <td style={{ padding: "12px 10px", fontSize: "0.9em" }}>
                                                    <strong>{session.exam_name || "Demo Exam"}</strong>
                                                    <div style={{ fontSize: "0.8em", color: "#666", fontFamily: "monospace" }}>
                                                        {session.session_id.substring(0, 8)}...
                                                    </div>
                                                </td>
                                                <td style={{ padding: "12px 10px", color: session.time_remaining_seconds < 60 ? "#dc3545" : "#111827", fontWeight: "bold" }}>
                                                    {session.time_remaining}
                                                </td>
                                                <td style={{ padding: "12px 10px", fontSize: "0.85em", lineHeight: "1.4" }}>
                                                    <span style={{ color: "#16a34a", fontWeight: "bold" }}>Face: {session.face_verification_status}</span>
                                                    <br />
                                                    <span style={{ color: "#2563eb", fontWeight: "bold" }}>Voice: {session.voice_verification_status}</span>
                                                    <br />
                                                    <span style={{ color: "#8b5cf6", fontWeight: "bold" }}>Live: {session.liveness_status}</span>
                                                </td>
                                                <td style={{ padding: "12px 10px", fontWeight: "bold" }}>{session.risk_score}</td>
                                                <td style={{ padding: "12px 10px" }}>
                                                    <span style={{
                                                        padding: "4px 8px",
                                                        borderRadius: "4px",
                                                        fontWeight: "bold",
                                                        fontSize: "0.85em",
                                                        textTransform: "uppercase",
                                                        ...badgeStyle
                                                    }}>
                                                        {session.risk_level}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "12px 10px", fontSize: "0.9em", color: "#dc3545", fontWeight: "bold" }}>
                                                    {session.latest_violation || "None"}
                                                </td>
                                                <td style={{ padding: "12px 10px", fontWeight: "bold" }}>{session.total_violations}</td>
                                                <td style={{ padding: "12px 10px" }}>
                                                    <button
                                                        onClick={() => navigate(`/report/${session.session_id}`)}
                                                        style={{
                                                            padding: "5px 10px",
                                                            fontSize: "0.85em",
                                                            backgroundColor: "#007bff",
                                                            border: "none",
                                                            color: "white",
                                                            borderRadius: "4px",
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        View Report
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
