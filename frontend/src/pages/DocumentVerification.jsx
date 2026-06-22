import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

function DocumentVerification() {
    const [lookupId, setLookupId] = useState("");
    const [candidate, setCandidate] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");
    const [selectedFiles, setSelectedFiles] = useState([]);

    const handleLookup = async (e) => {
        e.preventDefault();
        if (!lookupId.trim()) return;

        setLoading(true);
        setMessage("");
        setCandidate(null);

        try {
            const response = await axios.get(`/exam/candidate/${lookupId.trim()}`);
            if (response.data.success) {
                setCandidate(response.data.candidate);
            } else {
                setMessage(response.data.message || "Candidate not found");
                setMessageType("error");
            }
        } catch (error) {
            console.error(error);
            setMessage("Failed to lookup candidate. Please verify the ID.");
            setMessageType("error");
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        setSelectedFiles(Array.from(e.target.files));
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (selectedFiles.length === 0) {
            setMessage("Please select at least one document to upload");
            setMessageType("error");
            return;
        }

        setUploading(true);
        setMessage("");

        const formData = new FormData();
        formData.append("user_id", candidate.user_id);
        selectedFiles.forEach((file) => {
            formData.append("files", file);
        });

        try {
            const response = await axios.post("/users/verify-documents", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            if (response.data.success) {
                const statusVal = response.data.status || response.data.verification_status;
                setMessage(`Upload completed. Status: ${statusVal}`);
                setMessageType(statusVal === "VERIFIED" || statusVal === "PASS" ? "success" : "warning");
                
                // Refresh candidate data from backend
                const refreshRes = await axios.get(`/exam/candidate/${candidate.user_id}`);
                if (refreshRes.data.success) {
                    setCandidate(refreshRes.data.candidate);
                }
                setSelectedFiles([]);
            } else {
                setMessage(response.data.message || "Document verification failed");
                setMessageType("error");
            }
        } catch (error) {
            console.error(error);
            setMessage("Failed to upload and verify documents");
            setMessageType("error");
        } finally {
            setUploading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case "VERIFIED":
                return {
                    backgroundColor: "#e6fffa",
                    color: "#00a389",
                    border: "1px solid #b2f5ea",
                    padding: "8px 16px",
                    borderRadius: "20px",
                    fontWeight: "bold",
                    display: "inline-block",
                };
            case "OCR_FAILED":
                return {
                    backgroundColor: "#fff5f5",
                    color: "#e53e3e",
                    border: "1px solid #fed7d7",
                    padding: "8px 16px",
                    borderRadius: "20px",
                    fontWeight: "bold",
                    display: "inline-block",
                };
            default: // PENDING_DOCUMENTS
                return {
                    backgroundColor: "#fffaf0",
                    color: "#dd6b20",
                    border: "1px solid #feebc8",
                    padding: "8px 16px",
                    borderRadius: "20px",
                    fontWeight: "bold",
                    display: "inline-block",
                };
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
                    <Link to="/verify-docs">Verify Docs</Link>
                    <Link to="/admin">Admin</Link>
                    <Link to="/admin/exams">Exams</Link>
                </div>
            </div>

            <div className="container" style={{ maxWidth: "800px" }}>
                <h1>Intelligent Document Verification</h1>
                <p className="subtitle">OCR analysis & eligibility verification based on candidate category and income rules</p>

                <div className="form-card" style={{ marginTop: "30px", padding: "25px" }}>
                    <h3>Candidate Lookup</h3>
                    <form onSubmit={handleLookup} style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                        <input
                            type="text"
                            placeholder="Enter Candidate ID or Hall Ticket Number"
                            value={lookupId}
                            onChange={(e) => setLookupId(e.target.value)}
                            required
                            style={{ margin: 0, flex: 1 }}
                        />
                        <button type="submit" disabled={loading}>
                            {loading ? "Searching..." : "Lookup"}
                        </button>
                    </form>
                </div>

                {message && (
                    <div className={messageType === "error" ? "error" : "success"} style={{ margin: "20px auto", maxWidth: "520px" }}>
                        <strong>{message}</strong>
                    </div>
                )}

                {candidate && (
                    <div style={{ marginTop: "40px" }}>
                        <div className="card" style={{ width: "100%", textAlign: "left", marginBottom: "30px", padding: "25px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", paddingBottom: "15px", marginBottom: "15px" }}>
                                <div>
                                    <h2 style={{ margin: 0, color: "#2563eb" }}>{candidate.name}</h2>
                                    <p style={{ margin: "5px 0 0 0", color: "#666" }}>ID: {candidate.user_id} | UUID: {candidate.candidate_uuid}</p>
                                </div>
                                <div style={getStatusStyle(candidate.document_verification_status)}>
                                    {candidate.document_verification_status}
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "25px" }}>
                                <div>
                                    <strong>Category:</strong>
                                    <span style={{ marginLeft: "10px", padding: "4px 8px", backgroundColor: "#edf2f7", borderRadius: "5px", fontWeight: "bold" }}>
                                        {candidate.category}
                                    </span>
                                </div>
                                <div>
                                    <strong>Annual Income:</strong>
                                    <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
                                        {formatCurrency(candidate.annual_income)}
                                    </span>
                                </div>
                            </div>

                            <h3 style={{ borderBottom: "1px solid #eee", paddingBottom: "10px" }}>Required Documents Checklist</h3>
                            <ul style={{ listStyleType: "none", padding: 0, margin: "15px 0" }}>
                                {candidate.required_documents.map((doc) => {
                                    const isUploaded = candidate.uploaded_documents.includes(doc);
                                    return (
                                        <li
                                            key={doc}
                                            style={{
                                                padding: "12px 15px",
                                                marginBottom: "10px",
                                                borderRadius: "8px",
                                                backgroundColor: isUploaded ? "#f0fdf4" : "#fef2f2",
                                                borderLeft: `5px solid ${isUploaded ? "#16a34a" : "#dc2626"}`,
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "10px",
                                            }}
                                        >
                                            <span style={{
                                                fontSize: "1.25rem",
                                                color: isUploaded ? "#16a34a" : "#dc2626",
                                                fontWeight: "bold",
                                            }}>
                                                {isUploaded ? "✓" : "✗"}
                                            </span>
                                            <span style={{ fontWeight: "500", color: isUploaded ? "#166534" : "#991b1b" }}>
                                                {doc}
                                            </span>
                                            <span style={{ marginLeft: "auto", fontSize: "0.85rem", color: "#777" }}>
                                                {isUploaded ? "Verified by OCR" : "Missing / Required"}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        {candidate.aadhaar_details && (
                            <div className="card" style={{ width: "100%", textAlign: "left", marginBottom: "30px", padding: "25px", borderLeft: "5px solid #2563eb" }}>
                                <h3 style={{ marginTop: 0, color: "#2563eb" }}>Aadhaar OCR Verification Results</h3>
                                
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "20px" }}>
                                    <div>
                                        <strong>Extracted Name:</strong>
                                        <div style={{ padding: "8px", backgroundColor: "#f8fafc", borderRadius: "5px", marginTop: "5px", fontWeight: "500" }}>
                                            {candidate.aadhaar_details.extracted_name || "N/A"}
                                        </div>
                                    </div>
                                    <div>
                                        <strong>Extracted Aadhaar:</strong>
                                        <div style={{ padding: "8px", backgroundColor: "#f8fafc", borderRadius: "5px", marginTop: "5px", fontWeight: "500", fontFamily: "monospace" }}>
                                            {candidate.aadhaar_details.extracted_aadhaar_number || "N/A"}
                                        </div>
                                    </div>
                                    <div>
                                        <strong>Submitted DOB:</strong>
                                        <div style={{ padding: "8px", backgroundColor: "#f8fafc", borderRadius: "5px", marginTop: "5px", fontWeight: "500" }}>
                                            {candidate.aadhaar_details.submitted_dob || "N/A"}
                                        </div>
                                    </div>
                                    <div>
                                        <strong>Extracted DOB:</strong>
                                        <div style={{ padding: "8px", backgroundColor: "#f8fafc", borderRadius: "5px", marginTop: "5px", fontWeight: "500" }}>
                                            {candidate.aadhaar_details.extracted_dob || "N/A"}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: "20px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "10px 0" }}>
                                        <span style={{
                                            color: candidate.aadhaar_details.extracted_aadhaar_number && candidate.aadhaar_details.extracted_aadhaar_number.length === 12 ? "#16a34a" : "#dc2626",
                                            fontWeight: "bold",
                                            fontSize: "1.2em"
                                        }}>
                                            {candidate.aadhaar_details.extracted_aadhaar_number && candidate.aadhaar_details.extracted_aadhaar_number.length === 12 ? "✓" : "✗"}
                                        </span>
                                        <strong>Aadhaar Number Valid</strong>
                                        <span style={{ fontSize: "0.85em", color: "#666" }}>(Length = 12, digits only)</span>
                                    </div>
                                    
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "10px 0" }}>
                                        <span style={{
                                            color: candidate.aadhaar_details.aadhaar_match === true ? "#16a34a" : (candidate.aadhaar_details.aadhaar_match === false ? "#dc2626" : "#f59e0b"),
                                            fontWeight: "bold",
                                            fontSize: "1.2em"
                                        }}>
                                            {candidate.aadhaar_details.aadhaar_match === true ? "✓" : (candidate.aadhaar_details.aadhaar_match === false ? "✗" : "⚠")}
                                        </span>
                                        <strong>Aadhaar Matches Registration</strong>
                                        <span style={{ fontSize: "0.85em", color: "#666" }}>
                                            ({candidate.aadhaar_details.aadhaar_match === true ? "Match" : (candidate.aadhaar_details.aadhaar_match === false ? "Mismatch" : "Not Provided in Registration")})
                                        </span>
                                    </div>

                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "10px 0" }}>
                                        <span style={{
                                            color: candidate.aadhaar_details.name_match_score >= 85 ? "#16a34a" : (candidate.aadhaar_details.name_match_score >= 70 ? "#f59e0b" : "#dc2626"),
                                            fontWeight: "bold",
                                            fontSize: "1.2em"
                                        }}>
                                            {candidate.aadhaar_details.name_match_score >= 85 ? "✓" : (candidate.aadhaar_details.name_match_score >= 70 ? "⚠" : "✗")}
                                        </span>
                                        <strong>Name Match Score: {candidate.aadhaar_details.name_match_score}%</strong>
                                        <span style={{ fontSize: "0.85em", color: "#666" }}>{"(Target: >=85% for direct PASS)"}</span>
                                    </div>

                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "10px 0" }}>
                                        <span style={{
                                            color: candidate.aadhaar_details.dob_match === true ? "#16a34a" : "#dc2626",
                                            fontWeight: "bold",
                                            fontSize: "1.2em"
                                        }}>
                                            {candidate.aadhaar_details.dob_match === true ? "✓" : "✗"}
                                        </span>
                                        <strong>DOB Match:</strong>
                                        <span style={{ fontSize: "0.85em", color: "#666" }}>
                                            {candidate.aadhaar_details.dob_match ? "Matches Registration" : "Mismatch / Not Found"}
                                        </span>
                                    </div>

                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "10px 0" }}>
                                        <span style={{
                                            color: candidate.aadhaar_details.dob_verification_status === "PASS" ? "#16a34a" : (candidate.aadhaar_details.dob_verification_status === "MANUAL_REVIEW" ? "#f59e0b" : "#dc2626"),
                                            fontWeight: "bold",
                                            fontSize: "1.2em"
                                        }}>
                                            {candidate.aadhaar_details.dob_verification_status === "PASS" ? "✓" : (candidate.aadhaar_details.dob_verification_status === "MANUAL_REVIEW" ? "⚠" : "✗")}
                                        </span>
                                        <strong>DOB Status: {candidate.aadhaar_details.dob_verification_status}</strong>
                                        <span style={{ fontSize: "0.85em", color: "#666" }}>
                                            (Exact = PASS, Year Only / Not Found = MANUAL_REVIEW, Mismatch = FAIL)
                                        </span>
                                    </div>
                                </div>

                                <div style={{ borderTop: "1px solid #eee", paddingTop: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <strong style={{ fontSize: "1.1em" }}>Verification Status:</strong>
                                    <span style={{
                                        padding: "6px 15px",
                                        borderRadius: "20px",
                                        fontWeight: "bold",
                                        backgroundColor: candidate.aadhaar_details.verification_status === "PASS" ? "#e6fffa" : (candidate.aadhaar_details.verification_status === "MANUAL_REVIEW" ? "#fffaf0" : "#fff5f5"),
                                        color: candidate.aadhaar_details.verification_status === "PASS" ? "#00a389" : (candidate.aadhaar_details.verification_status === "MANUAL_REVIEW" ? "#dd6b20" : "#e53e3e"),
                                        border: `1px solid ${candidate.aadhaar_details.verification_status === "PASS" ? "#b2f5ea" : (candidate.aadhaar_details.verification_status === "MANUAL_REVIEW" ? "#feebc8" : "#fed7d7")}`
                                    }}>
                                        {candidate.aadhaar_details.verification_status}
                                    </span>
                                </div>
                                {candidate.aadhaar_details.extracted_text && (
                                    <div style={{ marginTop: "15px", borderTop: "1px solid #eee", paddingTop: "15px" }}>
                                        <strong>Extracted Text Block (Debugging):</strong>
                                        <pre style={{ margin: "10px 0 0 0", whiteSpace: "pre-wrap", wordBreak: "break-all", fontSize: "0.85em", backgroundColor: "#f8fafc", padding: "10px", borderRadius: "5px", fontFamily: "monospace", border: "1px solid #e2e8f0" }}>
                                            {candidate.aadhaar_details.extracted_text}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}

                        {candidate.caste_details && candidate.caste_details.caste_verification_status !== "PENDING" && (
                            <div className="card" style={{ width: "100%", textAlign: "left", marginBottom: "30px", padding: "25px", borderLeft: "5px solid #16a34a" }}>
                                <h3 style={{ marginTop: 0, color: "#16a34a" }}>Caste Certificate OCR Verification Results</h3>
                                
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px", marginBottom: "20px" }}>
                                    <div>
                                        <strong>Extracted Name:</strong>
                                        <div style={{ padding: "8px", backgroundColor: "#f8fafc", borderRadius: "5px", marginTop: "5px", fontWeight: "500" }}>
                                            {candidate.caste_details.caste_extracted_name || "N/A"}
                                        </div>
                                    </div>
                                    <div>
                                        <strong>Extracted Category:</strong>
                                        <div style={{ padding: "8px", backgroundColor: "#f8fafc", borderRadius: "5px", marginTop: "5px", fontWeight: "500" }}>
                                            {candidate.caste_details.caste_extracted_category || "N/A"}
                                        </div>
                                    </div>
                                    <div>
                                        <strong>Certificate Number:</strong>
                                        <div style={{ padding: "8px", backgroundColor: "#f8fafc", borderRadius: "5px", marginTop: "5px", fontWeight: "500", fontFamily: "monospace" }}>
                                            {candidate.caste_details.caste_extracted_cert_number || "N/A"}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: "20px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "10px 0" }}>
                                        <span style={{
                                            color: candidate.caste_details.caste_name_match_score >= 85 ? "#16a34a" : (candidate.caste_details.caste_name_match_score >= 70 ? "#f59e0b" : "#dc2626"),
                                            fontWeight: "bold",
                                            fontSize: "1.2em"
                                        }}>
                                            {candidate.caste_details.caste_name_match_score >= 85 ? "✓" : (candidate.caste_details.caste_name_match_score >= 70 ? "⚠" : "✗")}
                                        </span>
                                        <strong>Name Match Score: {candidate.caste_details.caste_name_match_score}%</strong>
                                        <span style={{ fontSize: "0.85em", color: "#666" }}>{"(Target: >=85% for direct PASS)"}</span>
                                    </div>
                                    
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "10px 0" }}>
                                        <span style={{
                                            color: candidate.caste_details.caste_category_match === "MATCH" ? "#16a34a" : "#dc2626",
                                            fontWeight: "bold",
                                            fontSize: "1.2em"
                                        }}>
                                            {candidate.caste_details.caste_category_match === "MATCH" ? "✓" : "✗"}
                                        </span>
                                        <strong>Category Match:</strong>
                                        <span style={{ fontSize: "0.85em", color: "#666" }}>
                                            ({candidate.caste_details.caste_category_match})
                                        </span>
                                    </div>
                                </div>

                                <div style={{ borderTop: "1px solid #eee", paddingTop: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <strong style={{ fontSize: "1.1em" }}>Verification Status:</strong>
                                    <span style={{
                                        padding: "6px 15px",
                                        borderRadius: "20px",
                                        fontWeight: "bold",
                                        backgroundColor: candidate.caste_details.caste_verification_status === "PASS" ? "#e6fffa" : (candidate.caste_details.caste_verification_status === "MANUAL_REVIEW" ? "#fffaf0" : "#fff5f5"),
                                        color: candidate.caste_details.caste_verification_status === "PASS" ? "#00a389" : (candidate.caste_details.caste_verification_status === "MANUAL_REVIEW" ? "#dd6b20" : "#e53e3e"),
                                        border: `1px solid ${candidate.caste_details.caste_verification_status === "PASS" ? "#b2f5ea" : (candidate.caste_details.caste_verification_status === "MANUAL_REVIEW" ? "#feebc8" : "#fed7d7")}`
                                    }}>
                                        {candidate.caste_details.caste_verification_status}
                                    </span>
                                </div>
                            </div>
                        )}

                        {candidate.income_details && candidate.income_details.income_verification_status !== "PENDING" && (
                            <div className="card" style={{ width: "100%", textAlign: "left", marginBottom: "30px", padding: "25px", borderLeft: "5px solid #d97706" }}>
                                <h3 style={{ marginTop: 0, color: "#d97706" }}>Income Certificate OCR Verification Results</h3>
                                
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "20px" }}>
                                    <div>
                                        <strong>Extracted Name:</strong>
                                        <div style={{ padding: "8px", backgroundColor: "#f8fafc", borderRadius: "5px", marginTop: "5px", fontWeight: "500" }}>
                                            {candidate.income_details.income_extracted_name || "N/A"}
                                        </div>
                                    </div>
                                    <div>
                                        <strong>Extracted Income:</strong>
                                        <div style={{ padding: "8px", backgroundColor: "#f8fafc", borderRadius: "5px", marginTop: "5px", fontWeight: "500" }}>
                                            {formatCurrency(candidate.income_details.income_extracted_amount)}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: "20px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "10px 0" }}>
                                        <span style={{
                                            color: candidate.income_details.income_name_match_score >= 85 ? "#16a34a" : (candidate.income_details.income_name_match_score >= 70 ? "#f59e0b" : "#dc2626"),
                                            fontWeight: "bold",
                                            fontSize: "1.2em"
                                        }}>
                                            {candidate.income_details.income_name_match_score >= 85 ? "✓" : (candidate.income_details.income_name_match_score >= 70 ? "⚠" : "✗")}
                                        </span>
                                        <strong>Name Match Score: {candidate.income_details.income_name_match_score}%</strong>
                                        <span style={{ fontSize: "0.85em", color: "#666" }}>{"(Target: >=85% for direct PASS)"}</span>
                                    </div>
                                    
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "10px 0" }}>
                                        <span style={{
                                            color: candidate.income_details.income_amount_match === "MATCH" ? "#16a34a" : "#dc2626",
                                            fontWeight: "bold",
                                            fontSize: "1.2em"
                                        }}>
                                            {candidate.income_details.income_amount_match === "MATCH" ? "✓" : "✗"}
                                        </span>
                                        <strong>{"Eligibility Match (<= 1,00,000):"}</strong>
                                        <span style={{ fontSize: "0.85em", color: "#666" }}>
                                            ({candidate.income_details.income_amount_match})
                                        </span>
                                    </div>
                                </div>

                                <div style={{ borderTop: "1px solid #eee", paddingTop: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <strong style={{ fontSize: "1.1em" }}>Verification Status:</strong>
                                    <span style={{
                                        padding: "6px 15px",
                                        borderRadius: "20px",
                                        fontWeight: "bold",
                                        backgroundColor: candidate.income_details.income_verification_status === "PASS" ? "#e6fffa" : (candidate.income_details.income_verification_status === "MANUAL_REVIEW" ? "#fffaf0" : "#fff5f5"),
                                        color: candidate.income_details.income_verification_status === "PASS" ? "#00a389" : (candidate.income_details.income_verification_status === "MANUAL_REVIEW" ? "#dd6b20" : "#e53e3e"),
                                        border: `1px solid ${candidate.income_details.income_verification_status === "PASS" ? "#b2f5ea" : (candidate.income_details.income_verification_status === "MANUAL_REVIEW" ? "#feebc8" : "#fed7d7")}`
                                    }}>
                                        {candidate.income_details.income_verification_status}
                                    </span>
                                </div>
                            </div>
                        )}


                        {candidate.document_verification_status !== "VERIFIED" && (
                            <div className="form-card" style={{ width: "100%", textAlign: "left", padding: "25px" }}>
                                <h3 style={{ marginTop: 0 }}>Upload Missing Documents</h3>
                                <p style={{ color: "#666", fontSize: "0.9em", marginBottom: "20px" }}>
                                    Please upload the documents for OCR extraction. The simulated OCR engine automatically detects document types based on filenames:
                                    <ul style={{ marginTop: "5px", paddingLeft: "20px" }}>
                                        <li><strong>Aadhaar / ID:</strong> File name containing <code>aadhaar</code>, <code>student</code>, or <code>id</code></li>
                                        <li><strong>Caste Certificate:</strong> File name containing <code>caste</code></li>
                                        <li><strong>Income Certificate:</strong> File name containing <code>income</code></li>
                                        <li>To test extraction failure, name your file containing <code>fail</code> or <code>corrupt</code>.</li>
                                    </ul>
                                </p>

                                <form onSubmit={handleUpload}>
                                    <label>Select Files</label>
                                    <input
                                        type="file"
                                        multiple
                                        onChange={handleFileChange}
                                        style={{ marginBottom: "15px" }}
                                        required
                                    />

                                    {selectedFiles.length > 0 && (
                                        <div style={{ marginBottom: "20px", backgroundColor: "#f8fafc", padding: "10px", borderRadius: "5px" }}>
                                            <strong>Selected Files:</strong>
                                            <ul style={{ margin: "5px 0 0 0", paddingLeft: "20px", fontSize: "0.9em" }}>
                                                {selectedFiles.map((file, idx) => (
                                                    <li key={idx}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <button type="submit" disabled={uploading} style={{ width: "100%" }}>
                                        {uploading ? "Analyzing with OCR..." : "Upload & Analyze Documents"}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

export default DocumentVerification;
