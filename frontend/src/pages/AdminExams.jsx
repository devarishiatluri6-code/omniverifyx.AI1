import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

function AdminExams() {
    const navigate = useNavigate();

    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form states
    const [examName, setExamName] = useState("");
    const [examType, setExamType] = useState("government");
    const [description, setDescription] = useState("");
    const [examDate, setExamDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [durationMinutes, setDurationMinutes] = useState(60);

    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            const response = await axios.get("/exams/");
            setExams(response.data || []);
        } catch (error) {
            console.error("Error fetching exams:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateExam = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMessage("");
        setSuccessMessage("");

        const payload = {
            exam_name: examName,
            exam_type: examType,
            description: description || null,
            exam_date: examDate,
            start_time: startTime,
            duration_minutes: parseInt(durationMinutes, 10)
        };

        try {
            const response = await axios.post("/exams/create", payload);
            if (response.data.success) {
                setSuccessMessage("Exam created successfully!");
                // Reset form fields
                setExamName("");
                setExamType("government");
                setDescription("");
                setExamDate("");
                setStartTime("");
                setDurationMinutes(60);

                // Reload list
                fetchExams();
            } else {
                setErrorMessage(response.data.message || "Failed to create exam");
            }
        } catch (error) {
            console.error("Error creating exam:", error);
            setErrorMessage(error.response?.data?.detail || "Failed to create exam. Check backend connection.");
        } finally {
            setSubmitting(false);
        }
    };

    const handlePublishExam = async (examId) => {
        try {
            const response = await axios.put(`/exams/${examId}/publish`);
            if (response.data.success) {
                fetchExams();
            }
        } catch (error) {
            console.error("Error publishing exam:", error);
            alert("Failed to publish exam");
        }
    };

    const handleCloseExam = async (examId) => {
        try {
            const response = await axios.put(`/exams/${examId}/close`);
            if (response.data.success) {
                fetchExams();
            }
        } catch (error) {
            console.error("Error closing exam:", error);
            alert("Failed to close exam");
        }
    };

    if (loading) {
        return (
            <div className="container">
                <h2>Loading Exams Manager...</h2>
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
                <h1>Manage Exams</h1>
                <p className="subtitle">Create and Publish Secure Exam Modules</p>

                {/* Form to create exam */}
                <div className="form-card" style={{ marginBottom: "30px" }}>
                    <h2>Create New Exam</h2>
                    <form onSubmit={handleCreateExam}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                            <div>
                                <label htmlFor="exam-name">Exam Name</label>
                                <input
                                    id="exam-name"
                                    type="text"
                                    placeholder="Enter Exam Name (e.g. UPSC CSE, Final Math)"
                                    value={examName}
                                    onChange={(e) => setExamName(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="exam-type">Exam Type</label>
                                <select
                                    id="exam-type"
                                    value={examType}
                                    onChange={(e) => setExamType(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "10px",
                                        borderRadius: "6px",
                                        border: "1px solid #ccc",
                                        marginTop: "5px",
                                        boxSizing: "border-box"
                                    }}
                                >
                                    <option value="government">Government</option>
                                    <option value="university">University</option>
                                </select>
                            </div>
                        </div>

                        <label htmlFor="description">Description (Optional)</label>
                        <textarea
                            id="description"
                            placeholder="Add brief details about the exam syllabus or guidelines..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            style={{
                                width: "100%",
                                height: "80px",
                                padding: "10px",
                                borderRadius: "6px",
                                border: "1px solid #ccc",
                                marginTop: "5px",
                                boxSizing: "border-box",
                                resize: "vertical"
                            }}
                        />

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px", marginTop: "15px" }}>
                            <div>
                                <label htmlFor="exam-date">Exam Date</label>
                                <input
                                    id="exam-date"
                                    type="date"
                                    value={examDate}
                                    onChange={(e) => setExamDate(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="start-time">Start Time</label>
                                <input
                                    id="start-time"
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="duration">Duration (Minutes)</label>
                                <input
                                    id="duration"
                                    type="number"
                                    min="1"
                                    value={durationMinutes}
                                    onChange={(e) => setDurationMinutes(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <br />
                        <button type="submit" disabled={submitting}>
                            {submitting ? "Creating..." : "Create Exam"}
                        </button>
                    </form>

                    {successMessage && (
                        <div className="success" style={{ marginTop: "15px", color: "#28a745", fontWeight: "bold" }}>
                            {successMessage}
                        </div>
                    )}

                    {errorMessage && (
                        <div className="error" style={{ marginTop: "15px" }}>
                            {errorMessage}
                        </div>
                    )}
                </div>

                {/* Listing of Exams */}
                <div className="form-card">
                    <h2>Existing Exam Schedules</h2>
                    {exams.length === 0 ? (
                        <p>No exams created yet.</p>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
                                <thead>
                                    <tr style={{ borderBottom: "2px solid #ccc", textAlign: "left" }}>
                                        <th style={{ padding: "8px" }}>Exam ID</th>
                                        <th style={{ padding: "8px" }}>Exam Name</th>
                                        <th style={{ padding: "8px" }}>Type</th>
                                        <th style={{ padding: "8px" }}>Date</th>
                                        <th style={{ padding: "8px" }}>Time</th>
                                        <th style={{ padding: "8px" }}>Duration</th>
                                        <th style={{ padding: "8px" }}>Status</th>
                                        <th style={{ padding: "8px" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {exams.map((exam) => (
                                        <tr key={exam.exam_id} style={{ borderBottom: "1px solid #eee" }}>
                                            <td style={{ padding: "8px", fontSize: "0.85em", fontFamily: "monospace" }}>{exam.exam_id}</td>
                                            <td style={{ padding: "8px", fontSize: "0.9em", fontWeight: "bold" }}>{exam.exam_name}</td>
                                            <td style={{ padding: "8px", fontSize: "0.9em", textTransform: "capitalize" }}>{exam.exam_type}</td>
                                            <td style={{ padding: "8px", fontSize: "0.9em" }}>{exam.exam_date}</td>
                                            <td style={{ padding: "8px", fontSize: "0.9em" }}>{exam.start_time}</td>
                                            <td style={{ padding: "8px", fontSize: "0.9em" }}>{exam.duration_minutes} mins</td>
                                            <td style={{ padding: "8px", fontSize: "0.9em" }}>
                                                <span style={{
                                                    padding: "2px 6px",
                                                    borderRadius: "4px",
                                                    fontWeight: "bold",
                                                    textTransform: "uppercase",
                                                    fontSize: "0.85em",
                                                    backgroundColor: exam.status === "published" ? "#d4edda" : exam.status === "closed" ? "#e2e3e5" : "#fff3cd",
                                                    color: exam.status === "published" ? "#155724" : exam.status === "closed" ? "#383d41" : "#856404"
                                                }}>
                                                    {exam.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: "8px" }}>
                                                <div style={{ display: "flex", gap: "5px" }}>
                                                    <button
                                                        onClick={() => handlePublishExam(exam.exam_id)}
                                                        disabled={exam.status !== "draft"}
                                                        style={{ padding: "4px 8px", fontSize: "0.8em", backgroundColor: exam.status === "draft" ? "#28a745" : "#ccc" }}
                                                    >
                                                        Publish
                                                    </button>
                                                    <button
                                                        onClick={() => handleCloseExam(exam.exam_id)}
                                                        disabled={exam.status !== "published"}
                                                        style={{ padding: "4px 8px", fontSize: "0.8em", backgroundColor: exam.status === "published" ? "#6c757d" : "#ccc" }}
                                                    >
                                                        Close
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <br />
                <Link to="/admin">
                    <button>Back to Dashboard</button>
                </Link>
            </div>
        </>
    );
}

export default AdminExams;
