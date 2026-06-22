import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

function HallTickets() {
    const navigate = useNavigate();
    const [userId, setUserId] = useState("");
    const [examId, setExamId] = useState("");
    const [exams, setExams] = useState([]);
    const [hallTickets, setHallTickets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        fetchExams();
        fetchHallTickets();
    }, []);

    const fetchExams = async () => {
        try {
            const response = await axios.get("/exams/");
            setExams(response.data || []);
        } catch (error) {
            console.error("Error fetching exams:", error);
        }
    };

    const fetchHallTickets = async () => {
        try {
            const response = await axios.get("/hall-tickets/");
            if (response.data.success) {
                setHallTickets(response.data.hall_tickets || []);
            }
        } catch (error) {
            console.error("Error fetching hall tickets:", error);
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!userId || !examId) {
            alert("Candidate ID and Exam ID are required");
            return;
        }

        setLoading(true);
        setMessage("");
        setErrorMessage("");

        try {
            const response = await axios.post("/hall-tickets/generate", {
                user_id: userId,
                exam_id: examId
            });

            if (response.data.success) {
                setMessage(response.data.message);
                setUserId("");
                setExamId("");
                fetchHallTickets();
            } else {
                setErrorMessage(response.data.message || "Failed to generate hall ticket");
            }
        } catch (error) {
            console.error(error);
            setErrorMessage(error.response?.data?.detail || "Error generating hall ticket");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (ticketNumber) => {
        if (!window.confirm(`Are you sure you want to cancel hall ticket ${ticketNumber}?`)) {
            return;
        }

        try {
            const response = await axios.put(`/hall-tickets/${ticketNumber}/cancel`);
            if (response.data.success) {
                alert(`Hall ticket ${ticketNumber} cancelled successfully`);
                fetchHallTickets();
            }
        } catch (error) {
            console.error(error);
            alert("Failed to cancel hall ticket");
        }
    };

    const formatDate = (value) => {
        if (!value) return "N/A";
        return new Date(value).toLocaleString();
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

            <div className="container">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", paddingBottom: "15px", marginBottom: "20px" }}>
                    <div>
                        <h1 style={{ margin: 0 }}>Hall Tickets Management</h1>
                        <p className="subtitle" style={{ margin: "5px 0 0 0" }}>Generate and manage candidate hall tickets</p>
                    </div>
                    <Link to="/admin">
                        <button style={{ backgroundColor: "#6c757d" }}>Back to Dashboard</button>
                    </Link>
                </div>

                <div className="form-card">
                    <h2>Generate New Hall Ticket</h2>
                    <form onSubmit={handleGenerate}>
                        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "flex-end" }}>
                            <div style={{ flex: 1, minWidth: "250px", textAlign: "left" }}>
                                <label>Candidate ID (User ID)</label>
                                <input
                                    type="text"
                                    placeholder="Enter enrolled candidate ID (e.g. candidate_123)"
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                    required
                                />
                            </div>

                            <div style={{ flex: 1, minWidth: "250px", textAlign: "left" }}>
                                <label>Select Exam</label>
                                <select
                                    value={examId}
                                    onChange={(e) => setExamId(e.target.value)}
                                    required
                                    style={{
                                        width: "100%",
                                        padding: "10px",
                                        borderRadius: "6px",
                                        border: "1px solid #ccc",
                                        backgroundColor: "#fff",
                                        fontSize: "1em",
                                        height: "42px",
                                        marginTop: "5px"
                                    }}
                                >
                                    <option value="">-- Choose Exam --</option>
                                    {exams.map((exam) => (
                                        <option key={exam.exam_id} value={exam.exam_id}>
                                            {exam.exam_name} ({exam.exam_id.substring(0, 8)}...)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button type="submit" disabled={loading} style={{ height: "42px", backgroundColor: "#28a745" }}>
                                {loading ? "Generating..." : "Generate Hall Ticket"}
                            </button>
                        </div>
                    </form>

                    {message && (
                        <div className="success" style={{ marginTop: "15px", fontWeight: "bold" }}>
                            {message}
                        </div>
                    )}

                    {errorMessage && (
                        <div className="error" style={{ marginTop: "15px", fontWeight: "bold" }}>
                            {errorMessage}
                        </div>
                    )}
                </div>

                <div className="form-card" style={{ marginTop: "30px" }}>
                    <h2>All Generated Hall Tickets</h2>
                    {hallTickets.length === 0 ? (
                        <p style={{ color: "#666" }}>No hall tickets generated yet.</p>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
                                <thead>
                                    <tr style={{ borderBottom: "2px solid #ccc", textAlign: "left" }}>
                                        <th style={{ padding: "10px" }}>Hall Ticket Number</th>
                                        <th style={{ padding: "10px" }}>Candidate Name</th>
                                        <th style={{ padding: "10px" }}>Exam Name</th>
                                        <th style={{ padding: "10px" }}>Exam Date</th>
                                        <th style={{ padding: "10px" }}>Start Time</th>
                                        <th style={{ padding: "10px" }}>Duration</th>
                                        <th style={{ padding: "10px" }}>Status</th>
                                        <th style={{ padding: "10px" }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {hallTickets.map((ticket, index) => {
                                        const isActive = ticket.status === "active";
                                        return (
                                            <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                                                <td style={{ padding: "10px", fontWeight: "bold", color: "#0056b3" }}>{ticket.hall_ticket_number}</td>
                                                <td style={{ padding: "10px" }}>
                                                    <div>{ticket.candidate_name || "N/A"}</div>
                                                    <div style={{ fontSize: "0.8em", color: "#666" }}>User ID: {ticket.user_id}</div>
                                                </td>
                                                <td style={{ padding: "10px" }}>{ticket.exam_name || "N/A"}</td>
                                                <td style={{ padding: "10px" }}>{ticket.exam_date || "N/A"}</td>
                                                <td style={{ padding: "10px" }}>{ticket.start_time || "N/A"}</td>
                                                <td style={{ padding: "10px" }}>{ticket.duration_minutes ? `${ticket.duration_minutes} min` : "N/A"}</td>
                                                <td style={{ padding: "10px" }}>
                                                    <span style={{
                                                        padding: "3px 8px",
                                                        borderRadius: "4px",
                                                        backgroundColor: isActive ? "#d4edda" : "#f8d7da",
                                                        color: isActive ? "#155724" : "#721c24",
                                                        fontWeight: "bold",
                                                        fontSize: "0.85em",
                                                        textTransform: "uppercase"
                                                    }}>
                                                        {ticket.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "10px", display: "flex", gap: "5px" }}>
                                                    <button
                                                        onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/hall-tickets/${ticket.hall_ticket_number}/pdf`, "_blank")}
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
                                                        Download PDF
                                                    </button>
                                                    {isActive && (
                                                        <button
                                                            onClick={() => handleCancel(ticket.hall_ticket_number)}
                                                            style={{
                                                                padding: "5px 10px",
                                                                fontSize: "0.85em",
                                                                backgroundColor: "#dc3545",
                                                                border: "none",
                                                                color: "white",
                                                                borderRadius: "4px",
                                                                cursor: "pointer"
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}
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

export default HallTickets;
