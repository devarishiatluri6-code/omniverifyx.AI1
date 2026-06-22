import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Webcam from "react-webcam";
import axios from "axios";

function Exam() {
    const webcamRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();

    const passedSessionId = location.state?.sessionId || localStorage.getItem("session_id") || "";
    const passedHallTicketNumber = location.state?.hallTicketNumber || localStorage.getItem("user_id") || "";
    const passedUserId = location.state?.userId || passedHallTicketNumber || "";

    const [sessionId, setSessionId] = useState(passedSessionId);
    const [userId, setUserId] = useState(passedUserId);
    const [hallTicketNumber, setHallTicketNumber] = useState(passedHallTicketNumber);
    const [monitoring, setMonitoring] = useState(false);
    const [lastStatus, setLastStatus] = useState("Monitoring not started");
    const [violations, setViolations] = useState([]);

    const [submitMessage, setSubmitMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [riskScore, setRiskScore] = useState(0);
    const [riskLevel, setRiskLevel] = useState("low");
    const [detectedObjects, setDetectedObjects] = useState([]);
    const [phoneWarning, setPhoneWarning] = useState(false);

    // Exam engine states
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds

    useEffect(() => {
        if (!sessionId) {
            navigate("/verify");
            return;
        }
        if (hallTicketNumber) {
            fetchQuestions();
        }
    }, [sessionId, hallTicketNumber, navigate]);

    // Timer Effect
    useEffect(() => {
        let timerId;
        if (monitoring && timeLeft > 0) {
            timerId = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            // Auto submit when time runs out
            handleSubmitExam(true);
        }

        return () => clearInterval(timerId);
    }, [monitoring, timeLeft]);

    // Proctoring Interval Effect
    useEffect(() => {
        let intervalId;

        if (monitoring) {
            intervalId = setInterval(() => {
                analyzeFrame();
            }, 5000);
        }

        return () => {
            clearInterval(intervalId);
        };
    }, [monitoring, sessionId, userId]);

    // Tab Switch Effect
    useEffect(() => {
        if (!monitoring || !sessionId || !userId) return;

        const handleVisibilityChange = async () => {
            if (document.hidden) {
                console.log("Tab switched detected!");
                try {
                    await axios.post(`/proctoring/log?session_id=${sessionId}&user_id=${userId}&violation_type=TAB_SWITCH&severity=high`);
                    setViolations(prev => [
                        {
                            violation_type: "TAB_SWITCH",
                            severity: "high",
                            timestamp: new Date().toISOString()
                        },
                        ...prev
                    ]);
                    setLastStatus("TAB_SWITCH detected");
                } catch (error) {
                    console.error("Failed to log tab switch:", error);
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [monitoring, sessionId, userId]);

    const fetchQuestions = async () => {
        try {
            let examId = "AUTO-DEMO-EXAM";
            try {
                const ticketRes = await axios.get(`/hall-tickets/${hallTicketNumber}`);
                if (ticketRes.data.success && ticketRes.data.hall_ticket) {
                    examId = ticketRes.data.hall_ticket.exam_id;
                }
            } catch (e) {
                console.error("Failed to fetch exam_id, falling back to demo", e);
            }

            const res = await axios.get(`/questions/exam/${examId}`);
            if (res.data.success) {
                setQuestions(res.data.questions || []);
                // Start monitoring automatically
                setMonitoring(true);
                setLastStatus("Live proctoring started");
            }
        } catch (error) {
            console.error("Error fetching questions:", error);
        }
    };

    const dataURLtoFile = (dataUrl, filename) => {
        const arr = dataUrl.split(",");
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);

        let n = bstr.length;
        const u8arr = new Uint8Array(n);

        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }

        return new File([u8arr], filename, {
            type: mime,
        });
    };

    const analyzeFrame = async () => {
        if (!webcamRef.current || !sessionId || !userId) {
            return;
        }

        const imageSrc = webcamRef.current.getScreenshot();

        if (!imageSrc) {
            return;
        }

        const imageFile = dataURLtoFile(imageSrc, "proctoring_frame.jpg");

        const data = new FormData();
        data.append("session_id", sessionId);
        data.append("user_id", userId);
        data.append("frame", imageFile);

        try {
            const response = await axios.post(
                "/proctoring/analyze-frame",
                data
            );

            const result = response.data;

            if (result.success) {
                setRiskScore(result.risk_score || 0);
                setRiskLevel(result.risk_level || "low");
                setDetectedObjects(result.detected_objects || []);

                if (result.violations_logged && result.violations_logged.length > 0) {
                    setViolations((prev) => [
                        ...result.violations_logged,
                        ...prev,
                    ]);

                    const hasPhone = result.violations_logged.some(v => v.violation_type === "PHONE_DETECTED");
                    if (hasPhone) {
                        setPhoneWarning(true);
                    }

                    const types = result.violations_logged.map(v => v.violation_type).join(", ");
                    setLastStatus(`${types} detected`);
                } else {
                    let statusMsg = `Normal. Face count: ${result.face_count}`;
                    if (result.detected_objects && result.detected_objects.length > 0) {
                        const labels = result.detected_objects.map(obj => obj.label);
                        statusMsg += ` | Detected: ${labels.join(", ")}`;
                    }
                    setLastStatus(statusMsg);
                }
            }
        } catch (error) {
            console.error(error);
            setLastStatus("Proctoring analysis failed");
        }
    };

    const handleSubmitExam = async (isAuto = false) => {
        if (submitting) return;

        setSubmitting(true);
        setSubmitMessage(isAuto ? "Time's up! Submitting exam automatically..." : "Submitting exam...");

        try {
            const answersPayload = questions.map(q => ({
                question_id: q.id,
                selected_answer: selectedAnswers[q.id] || null
            }));

            const response = await axios.post("/questions/submit", {
                session_id: sessionId,
                answers: answersPayload
            });

            setSubmitMessage("Exam submitted successfully. Redirecting to report...");
            setMonitoring(false);
            setTimeout(() => {
                navigate(`/report/${sessionId}`);
            }, 1500);

        } catch (error) {
            console.error("Submission failed:", error);
            setSubmitMessage("Failed to submit exam. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleAnswerSelect = (option) => {
        if (!questions[currentQuestionIndex]) return;
        const currentQ = questions[currentQuestionIndex];
        setSelectedAnswers(prev => ({
            ...prev,
            [currentQ.id]: option
        }));
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const currentQuestion = questions[currentQuestionIndex];

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

            <div className="container" style={{ maxWidth: "1200px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", paddingBottom: "15px", marginBottom: "20px" }}>
                    <div>
                        <h1 style={{ margin: 0 }}>Secure Exam Engine</h1>
                        <p className="subtitle" style={{ margin: "5px 0 0 0" }}>AI proctoring and validation active</p>
                    </div>
                    <div style={{ padding: "10px 20px", backgroundColor: "#fff3cd", color: "#856404", borderRadius: "8px", border: "1px solid #ffeeba", fontWeight: "bold", fontSize: "1.2em" }}>
                        Time Remaining: {formatTime(timeLeft)}
                    </div>
                </div>

                <div style={{ display: "flex", gap: "30px", flexWrap: "wrap" }}>
                    {/* Left Column: Webcam & Status */}
                    <div style={{ flex: "1", minWidth: "300px", maxWidth: "400px" }}>
                        <div className="form-card" style={{ marginBottom: "20px" }}>
                            <h2>Proctoring Feed</h2>
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                width="100%"
                                videoConstraints={{
                                    facingMode: "user",
                                }}
                                style={{ borderRadius: "8px", marginBottom: "15px" }}
                            />
                            <p style={{ fontSize: "0.95em", margin: "5px 0" }}>
                                <strong>Status:</strong> {lastStatus}
                            </p>
                            <p style={{ fontSize: "0.95em", margin: "5px 0" }}>
                                <strong>Risk Score:</strong> <span style={{ 
                                    color: riskLevel === "critical" || riskLevel === "high" ? "#dc3545" : riskLevel === "medium" ? "#fd7e14" : "#28a745",
                                    fontWeight: "bold"
                                }}>{riskScore} ({riskLevel.toUpperCase()})</span>
                            </p>
                            
                            {phoneWarning && (
                                <div style={{ marginTop: "15px", padding: "10px", backgroundColor: "#f8d7da", color: "#721c24", border: "1px solid #f5c6cb", borderRadius: "6px", fontWeight: "bold", textAlign: "center", fontSize: "0.9em" }}>
                                    Warning: Mobile phone usage detected!
                                </div>
                            )}
                        </div>

                        {violations.length > 0 && (
                            <div className="form-card status-denied" style={{ maxHeight: "250px", overflowY: "auto" }}>
                                <h3>Integrity Alerts</h3>
                                {violations.map((v, index) => (
                                    <div key={index} style={{ padding: "8px", borderBottom: "1px solid #ffd2d2", fontSize: "0.85em", color: "#dc3545" }}>
                                        <strong>{v.violation_type}</strong> - {v.severity.toUpperCase()}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Questions */}
                    <div style={{ flex: "2", minWidth: "500px" }}>
                        {currentQuestion ? (
                            <div className="form-card" style={{ textAlign: "left" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #eee", paddingBottom: "10px", marginBottom: "20px" }}>
                                    <h2>Question {currentQuestionIndex + 1} of {questions.length}</h2>
                                    <span style={{ padding: "4px 8px", backgroundColor: "#e2e8f0", borderRadius: "4px", fontSize: "0.9em", fontWeight: "bold" }}>
                                        {currentQuestion.marks} Mark(s)
                                    </span>
                                </div>

                                <p style={{ fontSize: "1.15em", fontWeight: "600", marginBottom: "20px", color: "#2d3748" }}>
                                    {currentQuestion.question_text}
                                </p>

                                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "30px" }}>
                                    {[
                                        { key: "A", val: currentQuestion.option_a },
                                        { key: "B", val: currentQuestion.option_b },
                                        { key: "C", val: currentQuestion.option_c },
                                        { key: "D", val: currentQuestion.option_d }
                                    ].map((opt) => {
                                        const isSelected = selectedAnswers[currentQuestion.id] === opt.key;
                                        return (
                                            <button
                                                key={opt.key}
                                                onClick={() => handleAnswerSelect(opt.key)}
                                                style={{
                                                    padding: "14px 20px",
                                                    borderRadius: "8px",
                                                    border: isSelected ? "2px solid #0056b3" : "1px solid #cbd5e0",
                                                    backgroundColor: isSelected ? "#e6f0fa" : "#ffffff",
                                                    color: isSelected ? "#0056b3" : "#2d3748",
                                                    textAlign: "left",
                                                    fontSize: "1em",
                                                    fontWeight: isSelected ? "bold" : "normal",
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "15px",
                                                    transition: "all 0.2s ease"
                                                }}
                                            >
                                                <span style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    width: "30px",
                                                    height: "30px",
                                                    borderRadius: "50%",
                                                    backgroundColor: isSelected ? "#0056b3" : "#edf2f7",
                                                    color: isSelected ? "#ffffff" : "#4a5568",
                                                    fontWeight: "bold"
                                                }}>
                                                    {opt.key}
                                                </span>
                                                {opt.val}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #eee", paddingTop: "20px", marginTop: "20px" }}>
                                    <div style={{ display: "flex", gap: "10px" }}>
                                        <button
                                            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                            disabled={currentQuestionIndex === 0}
                                            style={{ backgroundColor: "#6c757d" }}
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                                            disabled={currentQuestionIndex === questions.length - 1}
                                            style={{ backgroundColor: "#6c757d" }}
                                        >
                                            Next
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => handleSubmitExam(false)}
                                        disabled={submitting}
                                        style={{ backgroundColor: "#28a745" }}
                                    >
                                        {submitting ? "Submitting..." : "Submit Exam"}
                                    </button>
                                </div>

                                {/* Question Navigator */}
                                <div style={{ marginTop: "30px" }}>
                                    <h3 style={{ marginBottom: "15px", fontSize: "1.1em" }}>Question Navigator</h3>
                                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                        {questions.map((q, idx) => {
                                            const isAnswered = selectedAnswers[q.id] !== undefined;
                                            const isCurrent = idx === currentQuestionIndex;
                                            return (
                                                <button
                                                    key={q.id}
                                                    onClick={() => setCurrentQuestionIndex(idx)}
                                                    style={{
                                                        width: "36px",
                                                        height: "36px",
                                                        padding: 0,
                                                        borderRadius: "6px",
                                                        fontSize: "0.95em",
                                                        fontWeight: "bold",
                                                        backgroundColor: isCurrent ? "#0056b3" : isAnswered ? "#d4edda" : "#edf2f7",
                                                        color: isCurrent ? "#ffffff" : isAnswered ? "#155724" : "#4a5568",
                                                        border: isCurrent ? "2px solid #0056b3" : isAnswered ? "1px solid #c3e6cb" : "1px solid #cbd5e0",
                                                        cursor: "pointer",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center"
                                                    }}
                                                >
                                                    {idx + 1}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="form-card">
                                <p>Loading exam questions...</p>
                            </div>
                        )}

                        {submitMessage && (
                            <div style={{ marginTop: "20px", padding: "15px", borderRadius: "8px", backgroundColor: "#d4edda", color: "#155724", fontWeight: "bold", textAlign: "center" }}>
                                {submitMessage}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

export default Exam;