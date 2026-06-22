import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Webcam from "react-webcam";

function Enrollment() {
    const [step, setStep] = useState(1);
    
    // Step 1: Personal Details
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        mobile_number: "",
        role: "student",
        category: "OC",
        annual_income: 0,
        candidate_aadhaar_number: "",
        date_of_birth: "",
    });

    // Step 2: Documents & OCR
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrResult, setOcrResult] = useState(null);
    const [ocrError, setOcrError] = useState("");

    // Step 3: Face Capture
    const webcamRef = useRef(null);
    const [capturedImage, setCapturedImage] = useState(null);

    // Step 4: Voice Recording
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState("");
    const [countdown, setCountdown] = useState(10);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const mediaRecorderRef = useRef(null);

    // Step 5: Liveness Enrollment
    const [livenessLoading, setLivenessLoading] = useState(false);
    const [livenessResult, setLivenessResult] = useState(null);
    const [livenessPassed, setLivenessPassed] = useState(false);

    // Step 6: Completion
    const [submitting, setSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState("");
    const [enrollmentResult, setEnrollmentResult] = useState(null);

    // Dynamic document helper
    const getRequiredDocs = () => {
        const required = ["Aadhaar"];
        const casteCategories = ["BC-A", "BC-B", "BC-C", "BC-D", "BC-E", "SC", "ST"];
        if (casteCategories.includes(formData.category)) {
            required.append ? required.push("Caste Certificate") : required.push("Caste Certificate");
        }
        if (formData.annual_income <= 100000) {
            required.push("Income Certificate");
        }
        return required;
    };

    const requiredDocs = getRequiredDocs();

    const handleNextStep = () => {
        setStep(prev => prev + 1);
    };

    const handlePrevStep = () => {
        setStep(prev => prev - 1);
    };

    // Step 2 OCR triggers
    const handleFileChange = (e) => {
        setSelectedFiles(Array.from(e.target.files));
    };

    const runOcrCheck = async (e) => {
        e.preventDefault();
        if (selectedFiles.length === 0) {
            setOcrError("Please select document files to upload");
            return;
        }

        setOcrLoading(true);
        setOcrError("");
        setOcrResult(null);

        const data = new FormData();
        data.append("name", formData.name);
        data.append("aadhaar_number", formData.candidate_aadhaar_number);
        data.append("dob", formData.date_of_birth);
        data.append("category", formData.category);
        data.append("annual_income", formData.annual_income);
        selectedFiles.forEach((file) => {
            data.append("files", file);
        });

        try {
            const res = await axios.post("/exam/enroll/verify-ocr", data);
            if (res.data.success) {
                setOcrResult(res.data);
            } else {
                setOcrError(res.data.message || "OCR analysis failed");
            }
        } catch (err) {
            console.error(err);
            setOcrError("Document validation failed. Check details or verify backend is online.");
        } finally {
            setOcrLoading(false);
        }
    };

    // Step 3 Face triggers
    const captureImage = () => {
        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) {
            alert("Unable to capture image");
            return;
        }
        setCapturedImage(imageSrc);
    };

    // Step 4 Voice triggers
    const startRecording = async () => {
        setCountdown(10);
        setRecordingSeconds(0);
        setIsRecording(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            const chunks = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) chunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: "audio/webm" });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
                setIsRecording(false);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();

            let secondsLeft = 10;
            const interval = setInterval(() => {
                secondsLeft -= 1;
                setCountdown(secondsLeft);
                setRecordingSeconds(10 - secondsLeft);
                if (secondsLeft <= 0) {
                    clearInterval(interval);
                    if (mediaRecorder.state !== "inactive") {
                        mediaRecorder.stop();
                    }
                }
            }, 1000);

            mediaRecorderRef.current.interval = interval;
        } catch (err) {
            console.error(err);
            alert("Microphone capture failed");
            setIsRecording(false);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            if (mediaRecorderRef.current.interval) clearInterval(mediaRecorderRef.current.interval);
            if (mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    };

    // Step 5 Liveness triggers
    const runLivenessChallenge = async () => {
        setLivenessLoading(true);
        setLivenessResult(null);
        setLivenessPassed(false);
        try {
            const res = await axios.get("/biometrics/liveness");
            setLivenessResult(res.data);
            if (res.data.success && res.data.live) {
                setLivenessPassed(true);
            }
        } catch (err) {
            console.error(err);
            setLivenessResult({ success: false, message: "Liveness challenge failed to start. Please check backend logs." });
        } finally {
            setLivenessLoading(false);
        }
    };

    // Step 6 Final triggers
    const dataURLtoFile = (dataUrl, filename) => {
        const arr = dataUrl.split(",");
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    };

    const handleFinalSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setSubmitMessage("Finalizing enrollment and generating hall ticket...");

        const generatedCandidateId = `CAND-${Date.now()}`;
        const faceFile = dataURLtoFile(capturedImage, `${generatedCandidateId}_face.jpg`);
        const voiceFile = new File([audioBlob], `${generatedCandidateId}_voice.webm`, { type: "audio/webm" });

        const data = new FormData();
        data.append("user_id", generatedCandidateId);
        data.append("name", formData.name);
        data.append("email", formData.email);
        data.append("mobile_number", formData.mobile_number);
        data.append("role", "student");
        data.append("category", formData.category);
        data.append("annual_income", formData.annual_income);
        data.append("candidate_aadhaar_number", formData.candidate_aadhaar_number);
        data.append("date_of_birth", formData.date_of_birth);
        data.append("face_image", faceFile);
        data.append("voice_audio", voiceFile);
        selectedFiles.forEach((file) => {
            data.append("files", file);
        });

        try {
            const res = await axios.post("/exam/enroll-candidate", data);
            if (res.data.success) {
                setEnrollmentResult(res.data);
                setStep(6); // Go to Completion step
            } else {
                setSubmitMessage(res.data.message || "Enrollment failed");
            }
        } catch (err) {
            console.error(err);
            setSubmitMessage("Enrollment submission failed. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

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

            <div className="container" style={{ maxWidth: "800px" }}>
                <h1>Candidate Enrollment Portal</h1>
                <p className="subtitle">Secure multi-step registration wizard with dynamic OCR and biometric validation</p>

                {/* Progress Indicator */}
                {step < 6 && (
                    <div className="wizard-progress" style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px", borderBottom: "2px solid #e2e8f0", paddingBottom: "10px" }}>
                        {["Details", "Documents", "Face", "Voice", "Liveness"].map((label, idx) => {
                            const isCurrent = step === idx + 1;
                            const isPassed = step > idx + 1;
                            return (
                                <div key={label} style={{
                                    color: isCurrent ? "#0056b3" : isPassed ? "#28a745" : "#718096",
                                    fontWeight: isCurrent || isPassed ? "bold" : "normal",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "5px"
                                }}>
                                    <span style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: "24px",
                                        height: "24px",
                                        borderRadius: "50%",
                                        backgroundColor: isCurrent ? "#0056b3" : isPassed ? "#28a745" : "#e2e8f0",
                                        color: isCurrent || isPassed ? "#fff" : "#718096",
                                        fontSize: "0.85em"
                                    }}>{isPassed ? "✓" : idx + 1}</span>
                                    {label}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* STEP 1: Personal Details */}
                {step === 1 && (
                    <div className="form-card">
                        <h2>Step 1: Personal Details</h2>
                        <form onSubmit={(e) => { e.preventDefault(); handleNextStep(); }}>
                            <label>Full Name</label>
                            <input
                                type="text"
                                placeholder="Enter Full Name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />

                            <label>Email Address</label>
                            <input
                                type="email"
                                placeholder="Enter Email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />

                            <label>Mobile Number</label>
                            <input
                                type="tel"
                                placeholder="Enter 10-digit Mobile Number"
                                value={formData.mobile_number}
                                onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                                required
                                pattern="\d{10}"
                                title="Mobile number must be exactly 10 digits"
                            />

                            <label>Date of Birth</label>
                            <input
                                type="date"
                                value={formData.date_of_birth}
                                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                                required
                            />

                            <label>Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                required
                                style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", marginTop: "5px", marginBottom: "15px" }}
                            >
                                <option value="OC">OC (Open Category)</option>
                                <option value="BC-A">BC-A</option>
                                <option value="BC-B">BC-B</option>
                                <option value="BC-C">BC-C</option>
                                <option value="BC-D">BC-D</option>
                                <option value="BC-E">BC-E</option>
                                <option value="SC">SC (Scheduled Caste)</option>
                                <option value="ST">ST (Scheduled Tribe)</option>
                                <option value="EWS">EWS</option>
                            </select>

                            <label>Annual Income (₹)</label>
                            <input
                                type="number"
                                value={formData.annual_income}
                                onChange={(e) => setFormData({ ...formData, annual_income: parseFloat(e.target.value) || 0 })}
                                required
                                min="0"
                            />

                            <label>Aadhaar Number (12 digits)</label>
                            <input
                                type="text"
                                placeholder="Enter 12-digit Aadhaar Number"
                                value={formData.candidate_aadhaar_number}
                                onChange={(e) => setFormData({ ...formData, candidate_aadhaar_number: e.target.value.replace(/\D/g, "").slice(0, 12) })}
                                required
                                pattern="\d{12}"
                                title="Aadhaar number must be exactly 12 digits"
                            />

                            <button type="submit" style={{ width: "100%", marginTop: "15px" }}>
                                Next: Document Upload
                            </button>
                        </form>
                    </div>
                )}

                {/* STEP 2: Document Upload & OCR */}
                {step === 2 && (
                    <div className="form-card" style={{ textAlign: "left" }}>
                        <h2>Step 2: Document Upload & OCR Verification</h2>
                        
                        <div style={{ padding: "15px", backgroundColor: "#edf2f7", borderRadius: "8px", marginBottom: "20px" }}>
                            <strong>Required Documents for:</strong> {formData.category} | ₹{formData.annual_income?.toLocaleString()}
                            <ul style={{ margin: "10px 0 0 0", paddingLeft: "20px" }}>
                                {requiredDocs.map((doc) => (
                                    <li key={doc} style={{ fontWeight: "bold" }}>{doc}</li>
                                ))}
                            </ul>
                        </div>

                        <form onSubmit={runOcrCheck}>
                            <label>Select Files to Upload</label>
                            <input
                                type="file"
                                multiple
                                onChange={handleFileChange}
                                required
                                style={{ marginBottom: "15px" }}
                            />

                            <button type="submit" disabled={ocrLoading} style={{ width: "100%", backgroundColor: "#3182ce" }}>
                                {ocrLoading ? "Running OCR Analysis..." : "Upload & Verify with OCR"}
                            </button>
                        </form>

                        {ocrError && (
                            <div className="error" style={{ marginTop: "15px" }}>
                                {ocrError}
                            </div>
                        )}

                        {ocrResult && (
                            <div style={{ marginTop: "25px", padding: "15px", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px", marginBottom: "15px" }}>
                                    <h3 style={{ margin: 0 }}>OCR Results</h3>
                                    <span style={{
                                        padding: "4px 12px",
                                        borderRadius: "20px",
                                        fontWeight: "bold",
                                        color: "#fff",
                                        backgroundColor: ocrResult.status === "VERIFIED" || ocrResult.status === "PASS" ? "#48bb78" : (ocrResult.status === "MANUAL_REVIEW" ? "#dd6b20" : "#f56565")
                                    }}>
                                        {ocrResult.status}
                                    </span>
                                </div>

                                <div style={{ marginBottom: "15px", fontSize: "0.9em", display: "flex", flexDirection: "column", gap: "5px" }}>
                                    <p style={{ margin: "3px 0" }}><strong>Required Documents:</strong> {ocrResult.required_documents?.join(", ") || "None"}</p>
                                    <p style={{ margin: "3px 0" }}><strong>Uploaded Documents:</strong> {ocrResult.uploaded_documents?.join(", ") || "None"}</p>
                                    <p style={{ margin: "3px 0" }}><strong>Missing Documents:</strong> {ocrResult.missing_documents?.length > 0 ? ocrResult.missing_documents.join(", ") : "None"}</p>
                                    <p style={{ margin: "3px 0" }}><strong>Final OCR Status:</strong> <span style={{ fontWeight: "bold" }}>{ocrResult.status}</span></p>
                                </div>

                                {ocrResult.aadhaar_details && (
                                    <div style={{ marginBottom: "15px", fontSize: "0.95em", borderTop: "1px dashed #e2e8f0", paddingTop: "15px" }}>
                                        <h3 style={{ margin: "0 0 15px 0", color: "#2b6cb0", fontSize: "1.1em" }}>Aadhaar Verification Summary</h3>
                                        
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "15px" }}>
                                            <div style={{ backgroundColor: "#f7fafc", padding: "12px", borderRadius: "6px", borderLeft: "4px solid #4299e1" }}>
                                                <p style={{ margin: "4px 0" }}><strong>Submitted Aadhaar:</strong> {ocrResult.aadhaar_details.submitted_aadhaar}</p>
                                                <p style={{ margin: "4px 0" }}><strong>Extracted Aadhaar:</strong> {ocrResult.aadhaar_details.extracted_aadhaar || "Not extracted"}</p>
                                                <p style={{ margin: "4px 0" }}>
                                                    <strong>Aadhaar Match:</strong>{' '}
                                                    <span style={{ 
                                                        color: ocrResult.aadhaar_details.aadhaar_match === "PASS" ? "#48bb78" : "#f56565", 
                                                        fontWeight: "bold" 
                                                    }}>
                                                        {ocrResult.aadhaar_details.aadhaar_match}
                                                    </span>
                                                </p>
                                            </div>

                                            <div style={{ backgroundColor: "#f7fafc", padding: "12px", borderRadius: "6px", borderLeft: "4px solid #4299e1" }}>
                                                <p style={{ margin: "4px 0" }}><strong>Submitted Name:</strong> {ocrResult.aadhaar_details.submitted_name}</p>
                                                <p style={{ margin: "4px 0" }}><strong>Extracted Name:</strong> {ocrResult.aadhaar_details.extracted_name || "Not extracted"}</p>
                                                <p style={{ margin: "4px 0" }}>
                                                    <strong>Name Match Score:</strong>{' '}
                                                    <span style={{ 
                                                        color: ocrResult.aadhaar_details.name_match_score >= 85 ? "#48bb78" : (ocrResult.aadhaar_details.name_match_score >= 70 ? "#dd6b20" : "#f56565"), 
                                                        fontWeight: "bold" 
                                                    }}>
                                                        {ocrResult.aadhaar_details.name_match_score}%
                                                    </span>
                                                </p>
                                            </div>
                                        </div>

                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "15px" }}>
                                            <div style={{ backgroundColor: "#f7fafc", padding: "12px", borderRadius: "6px", borderLeft: "4px solid #4299e1" }}>
                                                <p style={{ margin: "4px 0" }}><strong>Submitted DOB:</strong> {ocrResult.aadhaar_details.submitted_dob}</p>
                                                <p style={{ margin: "4px 0" }}><strong>Extracted DOB:</strong> {ocrResult.aadhaar_details.extracted_dob || "Not extracted"}</p>
                                                <p style={{ margin: "4px 0" }}>
                                                    <strong>DOB Match:</strong>{' '}
                                                    <span style={{ 
                                                        color: ocrResult.aadhaar_details.dob_match === "PASS" ? "#48bb78" : (ocrResult.aadhaar_details.dob_match === "MANUAL_REVIEW" ? "#dd6b20" : "#f56565"), 
                                                        fontWeight: "bold" 
                                                    }}>
                                                        {ocrResult.aadhaar_details.dob_match}
                                                    </span>
                                                </p>
                                            </div>

                                            <div style={{ backgroundColor: "#f7fafc", padding: "12px", borderRadius: "6px", borderLeft: "4px solid #4299e1" }}>
                                                <p style={{ margin: "8px 0" }}>
                                                    <strong>Final OCR Status:</strong>{' '}
                                                    <span style={{ 
                                                        padding: "4px 10px",
                                                        borderRadius: "12px",
                                                        color: "#fff",
                                                        backgroundColor: ocrResult.status === "PASS" ? "#48bb78" : (ocrResult.status === "MANUAL_REVIEW" ? "#dd6b20" : "#f56565"),
                                                        fontWeight: "bold",
                                                        fontSize: "0.9em",
                                                        marginLeft: "5px",
                                                        display: "inline-block"
                                                    }}>
                                                        {ocrResult.status}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                        {ocrResult.aadhaar_details.extracted_text && (
                                            <div style={{ marginTop: "15px", backgroundColor: "#f7fafc", padding: "12px", borderRadius: "6px", borderLeft: "4px solid #4a5568" }}>
                                                <p style={{ margin: "4px 0" }}><strong>Extracted Text Block (Debugging):</strong></p>
                                                <pre style={{ margin: "5px 0 0 0", whiteSpace: "pre-wrap", wordBreak: "break-all", fontSize: "0.85em", backgroundColor: "#edf2f7", padding: "8px", borderRadius: "4px", fontFamily: "monospace", color: "#2d3748", textAlign: "left" }}>
                                                    {ocrResult.aadhaar_details.extracted_text}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "15px", display: "flex", gap: "10px" }}>
                                    <button type="button" onClick={handlePrevStep} style={{ backgroundColor: "#718096" }}>Back</button>
                                    {(ocrResult.status === "VERIFIED" || ocrResult.status === "PASS" || ocrResult.status === "MANUAL_REVIEW") && (
                                        <button type="button" onClick={handleNextStep} style={{ flex: 1, backgroundColor: "#48bb78" }}>
                                            Next: Face Capture
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 3: Face Capture */}
                {step === 3 && (
                    <div className="form-card">
                        <h2>Step 3: Face Capture</h2>
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            width="100%"
                            videoConstraints={{ facingMode: "user" }}
                            style={{ borderRadius: "10px", marginTop: "10px", marginBottom: "15px" }}
                        />
                        <button type="button" onClick={captureImage} style={{ width: "100%", backgroundColor: "#3182ce" }}>
                            Capture Photo
                        </button>

                        {capturedImage && (
                            <div style={{ marginTop: "20px" }}>
                                <h3>Captured Face</h3>
                                <img src={capturedImage} alt="Captured face" style={{ width: "100%", borderRadius: "10px" }} />
                                
                                <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                                    <button type="button" onClick={() => setCapturedImage(null)} style={{ backgroundColor: "#718096" }}>Retake</button>
                                    <button type="button" onClick={handleNextStep} style={{ flex: 1, backgroundColor: "#48bb78" }}>
                                        Next: Voice Recording
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 4: Voice Recording */}
                {step === 4 && (
                    <div className="form-card">
                        <h2>Step 4: Voice Enrollment</h2>
                        <p style={{ color: "#666" }}>Record a 10-second voice sample speaking clearly.</p>

                        <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "15px" }}>
                            <button type="button" onClick={startRecording} disabled={isRecording} style={{ backgroundColor: "#3182ce" }}>
                                {isRecording ? `Recording... (${countdown}s)` : "Record 10s Voice"}
                            </button>
                            <button type="button" onClick={stopRecording} disabled={!isRecording} style={{ backgroundColor: "#e53e3e" }}>
                                Stop
                            </button>
                        </div>

                        {audioUrl && (
                            <div style={{ marginTop: "20px" }}>
                                <h3>Recorded Voice sample</h3>
                                <audio src={audioUrl} controls style={{ width: "100%", margin: "10px 0" }} />
                                
                                <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                                    <button type="button" onClick={() => { setAudioBlob(null); setAudioUrl(""); }} style={{ backgroundColor: "#718096" }}>Reset</button>
                                    {recordingSeconds >= 9 && (
                                        <button type="button" onClick={handleNextStep} style={{ flex: 1, backgroundColor: "#48bb78" }}>
                                            Next: Liveness Challenge
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 5: Liveness Enrollment */}
                {step === 5 && (
                    <div className="form-card">
                        <h2>Step 5: Liveness Enrollment</h2>
                        <p style={{ color: "#666", textAlign: "left", marginBottom: "20px" }}>
                            To enroll, you must verify your identity. Click the button below. The challenge screen will open on the server screen. Please look straight, blink twice, turn left, turn right, and return to center.
                        </p>

                        <button type="button" onClick={runLivenessChallenge} disabled={livenessLoading} style={{ width: "100%", backgroundColor: "#3182ce" }}>
                            {livenessLoading ? "Liveness Challenge Active..." : "Run Liveness Challenge"}
                        </button>

                        {livenessResult && (
                            <div style={{ marginTop: "20px", padding: "15px", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                                <h3 style={{ color: livenessPassed ? "#48bb78" : "#f56565" }}>
                                    {livenessPassed ? "Liveness Passed" : "Liveness Failed"}
                                </h3>
                                <p>{livenessResult.message}</p>
                                
                                {livenessPassed && (
                                    <form onSubmit={handleFinalSubmit} style={{ marginTop: "25px" }}>
                                        <button type="submit" disabled={submitting} style={{ width: "100%", backgroundColor: "#48bb78" }}>
                                            {submitting ? "Finalizing Enrollment..." : "Finalize & Generate Hall Ticket"}
                                        </button>
                                        {submitMessage && (
                                            <p style={{ marginTop: "10px", fontWeight: "bold" }}>{submitMessage}</p>
                                        )}
                                    </form>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 6: Completion */}
                {step === 6 && enrollmentResult && (
                    <div className="form-card" style={{ padding: "30px", borderLeft: "5px solid #48bb78" }}>
                        <h2 style={{ color: "#48bb78" }}>Enrollment Completed Successfully!</h2>
                        <p style={{ color: "#666" }}>Your details and biometrics have been validated and saved.</p>
                        
                        <div style={{ margin: "25px 0", textAlign: "left", padding: "15px", backgroundColor: "#edf2f7", borderRadius: "8px" }}>
                            <p style={{ margin: "8px 0" }}><strong>Candidate UUID:</strong> <span style={{ fontFamily: "monospace" }}>{enrollmentResult.candidate?.candidate_uuid}</span></p>
                            <p style={{ margin: "8px 0" }}><strong>Hall Ticket Number:</strong> <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>{enrollmentResult.hall_ticket?.hall_ticket_number}</span></p>
                        </div>

                        <p style={{ margin: "15px 0", fontStyle: "italic", color: "#4a5568", fontWeight: "bold" }}>
                            Your hall ticket has been sent to your registered email.
                        </p>

                        <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "25px" }}>
                            <button
                                onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/hall-tickets/${enrollmentResult.hall_ticket?.hall_ticket_number}/pdf`, "_blank")}
                                style={{ backgroundColor: "#007bff" }}
                            >
                                Download Hall Ticket PDF
                            </button>
                            <Link to="/verify">
                                <button style={{ backgroundColor: "#28a745" }}>Go to Verification</button>
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

export default Enrollment;