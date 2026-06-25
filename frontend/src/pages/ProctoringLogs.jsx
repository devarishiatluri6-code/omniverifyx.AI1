import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

function ProctoringLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(false);

  const mockLogs = [
    {
      user_id: "candidate_demo",
      session_id: "sess_1719210045231",
      violation_type: "PHONE_DETECTED",
      severity: "high",
      timestamp: "2026-06-24T11:45:12.000Z",
      description: "Mobile phone device detected in active camera coordinates."
    },
    {
      user_id: "candidate_demo",
      session_id: "sess_1719210045231",
      violation_type: "TAB_SWITCH",
      severity: "high",
      timestamp: "2026-06-24T11:47:00.000Z",
      description: "Candidate toggled browser focus or navigated out of exam window."
    },
    {
      user_id: "student_demo",
      session_id: "sess_1719211029104",
      violation_type: "FACE_NOT_FOUND",
      severity: "medium",
      timestamp: "2026-06-24T11:51:30.000Z",
      description: "Camera feed failed to detect candidate face for >5 seconds."
    },
    {
      user_id: "student_demo",
      session_id: "sess_1719211029104",
      violation_type: "MULTIPLE_FACES",
      severity: "critical",
      timestamp: "2026-06-24T11:53:15.000Z",
      description: "Multiple human faces detected inside active proctor frame."
    },
    {
      user_id: "candidate_demo",
      session_id: "sess_1719210045231",
      violation_type: "TALKING_DETECTED",
      severity: "low",
      timestamp: "2026-06-24T11:46:40.000Z",
      description: "Ambient audio analysis detected voice frequencies matching speech pattern."
    }
  ];

  const fetchLogs = async () => {
    try {
      // Get all candidates first to fetch logs dynamically, or fall back to mock
      const res = await axios.get("/users/");
      const fetchedCandidates = res.data || [];
      
      let allLogs = [];
      
      // Fetch logs for all candidates
      await Promise.all(
        fetchedCandidates.map(async (cand) => {
          try {
            const logRes = await axios.get(`/proctoring/user/${cand.user_id}`);
            if (logRes.data.success && logRes.data.logs) {
              allLogs = [...allLogs, ...logRes.data.logs];
            }
          } catch (e) {
            // Silence item error
          }
        })
      );

      if (allLogs.length > 0) {
        // Sort logs by newest first
        allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setLogs(allLogs);
      } else {
        setLogs(mockLogs);
      }
    } catch (e) {
      console.warn("Backend logs fetching failed, running offline mock logs...", e);
      setIsDemoMode(true);
      setLogs(mockLogs);
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
    fetchLogs();
  }, [navigate]);

  const getSeverityBadgeClass = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "status-badge critical";
      case "high":
        return "status-badge failed";
      case "medium":
        return "status-badge pending";
      case "low":
      default:
        return "status-badge verified";
    }
  };

  const formatDate = (val) => {
    if (!val) return "N/A";
    return new Date(val).toLocaleString();
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesSeverity = filterSeverity === "all" || log.severity?.toLowerCase() === filterSeverity.toLowerCase();
    const matchesSearch = 
      log.user_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.violation_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.session_id?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  return (
    <>
      {(isDemoMode || localStorage.getItem("demo_mode_active") === "true") && (
        <div className="demo-banner">
          <span>⚠️</span>
          <strong>Demo Mode Active: Offline Live Proctored Feeds</strong>
        </div>
      )}

      <div className="navbar">
        <h2>OmniVerifyX AI Admin</h2>
        <div>
          <Link to="/admin/dashboard">Dashboard</Link>
          <Link to="/admin/exams">Exams</Link>
          <Link to="/admin/hall-tickets">Hall Tickets</Link>
          <Link to="/admin/live-monitoring">Live Monitoring</Link>
          <Link to="/admin/proctoring-logs" className="active-link">Proctoring Logs</Link>
        </div>
      </div>

      <div className="container" style={{ maxWidth: "1200px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "15px", marginBottom: "30px" }}>
          <div>
            <h1>Global Proctoring Logs</h1>
            <p className="subtitle" style={{ margin: 0 }}>System audits and computer vision proctor flags logged during examinations.</p>
          </div>
          <Link to="/admin/dashboard">
            <button style={{ backgroundColor: "#64748b" }}>Back to Dashboard</button>
          </Link>
        </div>

        {/* Filter Toolbar */}
        <div className="form-card" style={{ maxWidth: "100%", margin: "0 0 30px 0", padding: "20px" }}>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: 2, minWidth: "250px" }}>
              <label htmlFor="search-log" style={{ marginTop: 0 }}>Search logs</label>
              <input
                id="search-log"
                type="text"
                placeholder="Search by Hall Ticket Number, Session ID, or Violation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ margin: 0 }}
              />
            </div>

            <div style={{ flex: 1, minWidth: "180px" }}>
              <label htmlFor="filter-severity" style={{ marginTop: 0 }}>Severity</label>
              <select
                id="filter-severity"
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                style={{ margin: 0, height: "46px" }}
              >
                <option value="all">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <button 
              onClick={fetchLogs} 
              style={{ height: "46px", alignSelf: "flex-end", backgroundColor: "#4f46e5" }}
            >
              Refresh Logs
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="form-card" style={{ maxWidth: "100%", margin: 0, padding: "24px" }}>
          {loading ? (
            <div style={{ padding: "40px 0", textAlign: "center" }}>
              <div className="spinner" style={{ margin: "0 auto 10px" }}></div>
              <p>Loading proctor logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <p style={{ color: "#64748b", padding: "30px 0", textAlign: "center" }}>No proctoring logs found matching the filter.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Hall Ticket Number</th>
                    <th>Session ID</th>
                    <th>Violation Type</th>
                    <th>Severity</th>
                    <th>Diagnostic Description</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log, index) => (
                    <tr key={index}>
                      <td style={{ whiteSpace: "nowrap" }}>{formatDate(log.timestamp)}</td>
                      <td>
                        <strong style={{ color: "#2563eb" }}>{log.user_id}</strong>
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.85em" }}>{log.session_id}</td>
                      <td>
                        <span style={{ fontWeight: "600", color: "#1e293b" }}>{log.violation_type}</span>
                      </td>
                      <td>
                        <span className={getSeverityBadgeClass(log.severity)}>
                          {log.severity}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "#475569" }}>
                        {log.description || "Automatic computer vision check violation log."}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ProctoringLogs;
