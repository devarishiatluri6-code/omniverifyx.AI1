import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
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
  Legend,
  CartesianGrid
} from "recharts";

function Report() {
  const { sessionId } = useParams();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Mock Report Data
  const mockReport = {
    session_id: sessionId || "sess_1719210045231",
    candidate_name: "Jane Doe",
    hall_ticket_number: "candidate_demo",
    candidate_uuid: "candidate-uuid-222",
    login_time: new Date(Date.now() - 3600000).toISOString(),
    logout_time: new Date(Date.now() - 3000000).toISOString(),
    duration_seconds: 600,
    exam_name: "OmniVerifyX AI Demo Exam",
    score: 8,
    total_questions: 10,
    percentage: 80,
    correct_answers: 8,
    wrong_answers: 2,
    attempted_questions: 10,
    unanswered_questions: 0,
    time_taken: "10 mins 0 sec",
    average_time_per_question: 60,
    final_decision: "PASSED",
    face_similarity: 0.9412,
    voice_similarity: 0.9123,
    voice_threshold: 0.88,
    voice_match_result: "PASS",
    blink_count: 24,
    total_violations: 2,
    high_risk_violations: 2,
    risk_score: 45,
    risk_level: "medium",
    violations: [
      {
        violation_type: "PHONE_DETECTED",
        severity: "high",
        timestamp: new Date(Date.now() - 3400000).toISOString(),
        description: "Mobile phone device detected in active camera coordinates."
      },
      {
        violation_type: "TAB_SWITCH",
        severity: "high",
        timestamp: new Date(Date.now() - 3200000).toISOString(),
        description: "Candidate toggled browser focus or navigated out of exam window."
      }
    ]
  };

  useEffect(() => {
    fetchReport();
  }, [sessionId]);

  const fetchReport = async () => {
    try {
      const response = await axios.get(`/exam/report/${sessionId}`);

      if (response.data.success && response.data.report) {
        setReport(response.data.report);
      } else {
        setReport(mockReport);
      }
    } catch (error) {
      console.warn("Backend report fetch failed, loading mock report...", error);
      setIsDemoMode(true);
      setReport(mockReport);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="container" style={{ textAlign: "center", padding: "100px 0" }}>
        <div className="spinner" style={{ margin: "0 auto 20px" }}></div>
        <h2>Loading Exam Session Report...</h2>
      </div>
    );
  }

  // Visual metrics data for Recharts
  const scoreData = [
    { name: "Correct", value: report.correct_answers || 0 },
    { name: "Incorrect", value: report.wrong_answers || 0 },
    { name: "Unanswered", value: report.unanswered_questions || 0 }
  ];

  const biometricData = [
    { name: "Face Similarity", Score: report.face_similarity ? parseFloat(report.face_similarity.toFixed(4)) : 0, Threshold: 0.75 },
    { name: "Voice Similarity", Score: report.voice_similarity ? parseFloat(report.voice_similarity.toFixed(4)) : 0, Threshold: report.voice_threshold || 0.88 }
  ];

  const SCORE_COLORS = ["#10b981", "#ef4444", "#94a3b8"];

  const getDecisionBadgeClass = (decision) => {
    switch (decision?.toUpperCase()) {
      case "PASSED":
        return "status-badge pass";
      case "REVIEW REQUIRED":
        return "status-badge pending";
      case "FAILED":
      default:
        return "status-badge fail";
    }
  };

  return (
    <>
      {isDemoMode && (
        <div className="demo-banner no-print">
          <span>⚠️</span>
          <strong>Demo Mode Active: Offline Session Report Enabled</strong>
        </div>
      )}

      <div className="navbar no-print">
        <h2>OmniVerifyX AI</h2>
        <div>
          <Link to="/">Home</Link>
          <Link to="/admin/dashboard">Admin Dashboard</Link>
          <button onClick={() => window.print()} style={{ backgroundColor: "#2563eb" }}>Print Report</button>
        </div>
      </div>

      <div className="container" style={{ maxWidth: "1000px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "15px", marginBottom: "30px" }}>
          <div>
            <h1>Session Audit Report</h1>
            <p className="subtitle" style={{ margin: 0 }}>AI-generated exam integrity summary and candidate metrics.</p>
          </div>
          <Link to="/admin/dashboard" className="no-print">
            <button style={{ backgroundColor: "#64748b" }}>Back to Dashboard</button>
          </Link>
        </div>

        {/* Final Report Decision header */}
        <div className="card status-granted" style={{ borderLeft: "6px solid var(--primary-color)", padding: "30px", marginBottom: "30px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", alignItems: "center", gap: "20px" }}>
            <div>
              <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>System Evaluation Outcome</span>
              <h2 style={{ fontSize: "1.75rem", fontWeight: "700", marginTop: "4px" }}>
                Candidate: {report.candidate_name || "Jane Doe"}
              </h2>
              <span style={{ fontSize: "0.9rem", color: "#475569" }}>Session ID: <span style={{ fontFamily: "monospace" }}>{report.session_id}</span></span>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "0.85rem", color: "#64748b", display: "block" }}>Final Proctoring Decision:</span>
              <span className={getDecisionBadgeClass(report.final_decision)} style={{ fontSize: "1rem", padding: "6px 16px", marginTop: "5px" }}>
                {report.final_decision || "FAILED"}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Grid Summary info */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "25px", marginBottom: "30px" }}>
          
          {/* Card 1: Session Parameters */}
          <div className="card" style={{ height: "fit-content" }}>
            <h2 style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "8px", color: "var(--primary-color)" }}>Session Parameters</h2>
            <table style={{ width: "100%", marginTop: 0 }}>
              <tbody>
                <tr>
                  <td style={{ padding: "8px 0", fontWeight: "600" }}>Login Time:</td>
                  <td style={{ padding: "8px 0" }}>{formatDate(report.login_time)}</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", fontWeight: "600" }}>Logout Time:</td>
                  <td style={{ padding: "8px 0" }}>{formatDate(report.logout_time)}</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", fontWeight: "600" }}>Duration:</td>
                  <td style={{ padding: "8px 0" }}>{formatDuration(report.duration_seconds)}</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", fontWeight: "600" }}>Exam Name:</td>
                  <td style={{ padding: "8px 0" }}>{report.exam_name || "N/A"}</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", fontWeight: "600" }}>Score Secured:</td>
                  <td style={{ padding: "8px 0" }}>{report.score !== undefined ? `${report.score} / ${report.total_questions}` : "N/A"} ({report.percentage}%)</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Card 2: Biometric & Liveness Audit */}
          <div className="card" style={{ height: "fit-content" }}>
            <h2 style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "8px", color: "var(--indigo)" }}>Biometric Onboarding Match</h2>
            <table style={{ width: "100%", marginTop: 0 }}>
              <tbody>
                <tr>
                  <td style={{ padding: "8px 0", fontWeight: "600" }}>Face Verification:</td>
                  <td style={{ padding: "8px 0" }}>{report.face_similarity ? report.face_similarity.toFixed(4) : "N/A"} <span style={{ color: "#64748b", fontSize: "0.8rem" }}>(Match threshold &gt;= 0.75)</span></td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", fontWeight: "600" }}>Voice Verification:</td>
                  <td style={{ padding: "8px 0" }}>{report.voice_similarity ? report.voice_similarity.toFixed(4) : "N/A"} <span style={{ color: "#64748b", fontSize: "0.8rem" }}>(Match threshold &gt;= {report.voice_threshold})</span></td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", fontWeight: "600" }}>Voice Match Result:</td>
                  <td style={{ padding: "8px 0" }}>
                    <span style={{ fontWeight: "700", color: report.voice_match_result === "PASS" ? "var(--success)" : "var(--danger)" }}>
                      {report.voice_match_result || "FAIL"}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", fontWeight: "600" }}>Blink Liveness Count:</td>
                  <td style={{ padding: "8px 0" }}>{report.blink_count ?? 0} blinks</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", fontWeight: "600" }}>Overall Integrity:</td>
                  <td style={{ padding: "8px 0" }}>
                    <span className={`status-badge ${report.risk_level === "low" ? "pass" : report.risk_level === "medium" ? "review" : "fail"}`}>
                      Risk level: {report.risk_level}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Analytics Charts Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "25px", marginBottom: "30px" }}>
          {/* Chart 1: Questions Score */}
          <div className="card" style={{ height: "340px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <h3 style={{ fontSize: "1rem", color: "#0f172a", marginBottom: "15px", textAlign: "center" }}>Exam Question Outcomes</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={scoreData}
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ name, value }) => `${name}: ${value}`}
                  dataKey="value"
                >
                  {scoreData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SCORE_COLORS[index % SCORE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 2: Biometric Score vs Threshold */}
          <div className="card" style={{ height: "340px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <h3 style={{ fontSize: "1rem", color: "#0f172a", marginBottom: "15px", textAlign: "center" }}>Biometric Score vs Target Threshold</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={biometricData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 1.0]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Score" fill="var(--indigo)" />
                <Bar dataKey="Threshold" fill="var(--warning)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Proctoring Summary stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "30px" }}>
          <div className="card" style={{ borderLeft: "4px solid var(--danger)", padding: "18px" }}>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Total violations</span>
            <h2 style={{ fontSize: "1.75rem", margin: 0, color: "var(--danger)" }}>{report.total_violations}</h2>
          </div>
          <div className="card" style={{ borderLeft: "4px solid var(--danger)", padding: "18px" }}>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>High Risk violations</span>
            <h2 style={{ fontSize: "1.75rem", margin: 0, color: "var(--danger)" }}>{report.high_risk_violations}</h2>
          </div>
          <div className="card" style={{ borderLeft: "4px solid var(--warning)", padding: "18px" }}>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Composite Risk Score</span>
            <h2 style={{ fontSize: "1.75rem", margin: 0, color: "var(--warning)" }}>{report.risk_score}%</h2>
          </div>
          <div className="card" style={{ borderLeft: "4px solid var(--primary-color)", padding: "18px" }}>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Audit Risk Level</span>
            <h2 style={{ fontSize: "1.5rem", margin: 0, textTransform: "capitalize" }}>{report.risk_level}</h2>
          </div>
        </div>

        {/* Violations Timeline Details Table */}
        <div className="form-card" style={{ maxWidth: "100%", margin: 0, padding: "24px" }}>
          <h2>Proctor violation Audit Logs</h2>
          {report.violations.length === 0 ? (
            <p style={{ color: "#64748b", padding: "15px 0" }}>No proctoring violations detected. Candidate exam integrity verified.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Violation Category</th>
                    <th>Severity Badge</th>
                    <th>Diagnostic Log Message</th>
                  </tr>
                </thead>
                <tbody>
                  {report.violations.map((violation, index) => {
                    const isHigh = violation.severity === "high" || violation.severity === "critical";
                    return (
                      <tr key={index}>
                        <td style={{ whiteSpace: "nowrap" }}>{formatDate(violation.timestamp)}</td>
                        <td style={{ fontWeight: "700", color: isHigh ? "var(--danger)" : "var(--text-primary)" }}>
                          {violation.violation_type}
                        </td>
                        <td>
                          <span className={`status-badge ${violation.severity === "critical" ? "critical" : isHigh ? "fail" : "pending"}`}>
                            {violation.severity}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.88rem", color: "#475569" }}>
                          {violation.description || "Automatic computer vision check violation log."}
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

export default Report;
