import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

function Report() {
  const { sessionId } = useParams();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchReport();
  }, [sessionId]);

  const fetchReport = async () => {
    try {
      const response = await axios.get(
        `http://localhost:8000/exam/report/${sessionId}`
      );

      if (response.data.success) {
        setReport(response.data.report);
      } else {
        setErrorMessage(response.data.message || "Report not found");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Failed to fetch report");
    }

    setLoading(false);
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
      <div className="container">
        <h2>Loading report...</h2>
      </div>
    );
  }

  if (errorMessage) {
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
          <div className="error">{errorMessage}</div>

          <br />

          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <Link to="/admin">
              <button>Back to Admin</button>
            </Link>
            <Link to="/">
              <button style={{ backgroundColor: "#6c757d" }}>Back Home</button>
            </Link>
          </div>
        </div>
      </>
    );
  }

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
        <h1>Final Session Report</h1>

        <p className="subtitle">
          AI-generated exam integrity summary
        </p>

        <div className="form-card">
          <h2>Final Report & Exam Decision</h2>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", textAlign: "left", marginBottom: "20px" }}>
            <div>
              <h3 style={{ margin: "0 0 10px 0", borderBottom: "1px solid #ddd", paddingBottom: "5px" }}>Candidate & Session</h3>
              <p style={{ margin: "6px 0" }}><strong>Candidate Name:</strong> {report.candidate_name || "N/A"}</p>
              <p style={{ margin: "6px 0" }}><strong>Hall Ticket Number:</strong> {report.hall_ticket_number || report.user_id}</p>
              {report.candidate_uuid && <p style={{ margin: "6px 0" }}><strong>Candidate UUID:</strong> <span style={{ fontFamily: "monospace", fontSize: "0.85em" }}>{report.candidate_uuid}</span></p>}
              <p style={{ margin: "6px 0" }}><strong>Session ID:</strong> <span style={{ fontFamily: "monospace", fontSize: "0.85em" }}>{report.session_id}</span></p>
              <p style={{ margin: "6px 0" }}><strong>Login Time:</strong> {formatDate(report.login_time)}</p>
              <p style={{ margin: "6px 0" }}><strong>Logout Time:</strong> {formatDate(report.logout_time)}</p>
              <p style={{ margin: "6px 0" }}><strong>Duration:</strong> {formatDuration(report.duration_seconds)}</p>
            </div>
            <div>
              <h3 style={{ margin: "0 0 10px 0", borderBottom: "1px solid #ddd", paddingBottom: "5px" }}>Exam Performance</h3>
              <p style={{ margin: "6px 0" }}><strong>Exam Name:</strong> {report.exam_name || "N/A"}</p>
              <p style={{ margin: "6px 0" }}><strong>Score:</strong> {report.score !== undefined ? `${report.score} / ${report.total_questions}` : "N/A"}</p>
              <p style={{ margin: "6px 0" }}><strong>Percentage:</strong> {report.percentage !== undefined ? `${report.percentage}%` : "N/A"}</p>
              <p style={{ margin: "6px 0" }}><strong>Correct Answers:</strong> {report.correct_answers !== undefined ? report.correct_answers : "N/A"}</p>
              <p style={{ margin: "6px 0" }}><strong>Wrong Answers:</strong> {report.wrong_answers !== undefined ? report.wrong_answers : "N/A"}</p>
              <p style={{ margin: "6px 0" }}><strong>Attempted Questions:</strong> {report.attempted_questions !== undefined ? report.attempted_questions : "N/A"}</p>
              <p style={{ margin: "6px 0" }}><strong>Unanswered Questions:</strong> {report.unanswered_questions !== undefined ? report.unanswered_questions : "N/A"}</p>
              <p style={{ margin: "6px 0" }}><strong>Time Taken:</strong> {report.time_taken || "N/A"}</p>
              <p style={{ margin: "6px 0" }}><strong>Average Time/Question:</strong> {report.average_time_per_question !== undefined ? `${report.average_time_per_question}s` : "N/A"}</p>

              <p style={{ margin: "6px 0" }}>
                <strong>Final Decision:</strong>{" "}
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    color: "white",
                    fontWeight: "bold",
                    fontSize: "0.9em",
                    backgroundColor: report.final_decision === "PASSED" ? "#28a745" : report.final_decision === "REVIEW REQUIRED" ? "#fd7e14" : "#dc3545"
                  }}
                >
                  {report.final_decision || "FAILED"}
                </span>
              </p>
            </div>
          </div>

          <hr />

          <h2>Biometric Summary</h2>

          <p>
            <strong>Face Similarity:</strong>{" "}
            {report.face_similarity
              ? report.face_similarity.toFixed(4)
              : "N/A"}
          </p>

          <p>
            <strong>Voice Similarity:</strong>{" "}
            {report.voice_similarity
              ? report.voice_similarity.toFixed(4)
              : "N/A"}
          </p>

          <p>
            <strong>Voice Threshold:</strong>{" "}
            {report.voice_threshold !== undefined ? report.voice_threshold : "0.88"}
          </p>

          <p>
            <strong>Voice Match Result:</strong>{" "}
            <span style={{
              fontWeight: "bold",
              color: (report.voice_match_result || (report.voice_similarity && report.voice_similarity >= 0.88 ? "PASS" : "FAIL")) === "PASS" ? "#28a745" : "#dc3545"
            }}>
              {report.voice_match_result || (report.voice_similarity && report.voice_similarity >= 0.88 ? "PASS" : "FAIL")}
            </span>
          </p>

          <p><strong>Blink Count:</strong> {report.blink_count}</p>

          <hr />

          <h2>Proctoring Summary</h2>
          <p><strong>Total Violations:</strong> {report.total_violations}</p>
          <p><strong>High Risk Violations:</strong> {report.high_risk_violations}</p>
          <p><strong>Risk Score:</strong> {report.risk_score !== undefined ? report.risk_score : "N/A"}</p>
          <p><strong>Risk Level:</strong> <span style={{ textTransform: "capitalize", fontWeight: "bold" }}>{report.risk_level || "N/A"}</span></p>
        </div>

        <div className="form-card">
          <h2>Violation Details</h2>

          {report.violations.length === 0 ? (
            <p>No violations detected.</p>
          ) : (
            report.violations.map((violation, index) => (
              <div
                key={index}
                className={
                  violation.severity === "high" ||
                  violation.severity === "critical"
                    ? "error"
                    : "success"
                }
                style={{
                  padding: "10px",
                  borderRadius: "6px",
                  marginBottom: "10px",
                  borderLeft: `5px solid ${
                    violation.severity === "high" || violation.severity === "critical"
                      ? "#dc3545"
                      : "#28a745"
                  }`
                }}
              >
                <p>
                  <strong>Violation:</strong>{" "}
                  {violation.violation_type}
                </p>

                <p>
                  <strong>Severity:</strong>{" "}
                  {violation.severity}
                </p>

                <p>
                  <strong>Timestamp:</strong>{" "}
                  {formatDate(violation.timestamp)}
                </p>
              </div>
            ))
          )}
        </div>

        <br />

        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <Link to="/admin">
            <button>Back to Admin</button>
          </Link>
          <Link to="/">
            <button style={{ backgroundColor: "#6c757d" }}>Back Home</button>
          </Link>
        </div>
      </div>
    </>
  );
}

export default Report;
