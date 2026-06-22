import { useRef, useState } from "react";
import axios from "axios";
import Webcam from "react-webcam";
import { Link, useNavigate } from "react-router-dom";

function Verification() {
    const webcamRef = useRef(null);
    const navigate = useNavigate();

    const [userId, setUserId] = useState("");
    const [hallTicketNumber, setHallTicketNumber] = useState("");
    const [capturedImage, setCapturedImage] = useState(null);
    const [cameraStopped, setCameraStopped] = useState(false);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    // Audio recording states
    const [recording, setRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [countdown, setCountdown] = useState(10);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const [uploadedAudioFile, setUploadedAudioFile] = useState(null);

    const captureImage = () => {
        const imageSrc = webcamRef.current.getScreenshot();
        setCapturedImage(imageSrc);

        const video = webcamRef.current.video;
        const stream = video.srcObject;

        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setCameraStopped(true);
        }
    };

    const startRecording = async () => {
        setRecording(true);
        setCountdown(10);
        audioChunksRef.current = [];

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
                setRecording(false);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();

            let secondsLeft = 10;
            const interval = setInterval(() => {
                secondsLeft -= 1;
                setCountdown(secondsLeft);
                if (secondsLeft <= 0) {
                    clearInterval(interval);
                    if (mediaRecorder.state !== "inactive") {
                        mediaRecorder.stop();
                    }
                }
            }, 1000);

        } catch (err) {
            console.error("Audio recording failed:", err);
            alert("Microphone permission denied or not found");
            setRecording(false);
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

    const handleVerify = async (e) => {
        e.preventDefault();

        if (!capturedImage) {
            setResult({
                success: false,
                access: "denied",
                message: "Please capture face image first",
            });
            return;
        }

        if (!audioBlob && !uploadedAudioFile) {
            setResult({
                success: false,
                access: "denied",
                message: "Please record a 10-second voice sample or upload an audio file first",
            });
            return;
        }

        setLoading(true);
        setResult(null);

        const imageFile = dataURLtoFile(
            capturedImage,
            "verification_face.jpg"
        );

        const voiceFile = uploadedAudioFile || new File([audioBlob], "verification_voice.webm", {
            type: "audio/webm"
        });

        const data = new FormData();
        data.append("hall_ticket_number", hallTicketNumber);
        data.append("image", imageFile);
        data.append("voice_audio", voiceFile);

        try {
            const response = await axios.post(
                "/exam/verify-access",
                data
            );

            setResult(response.data);

            if (response.data.access === "granted") {
                localStorage.setItem("session_id", response.data.session_id);
                localStorage.setItem("user_id", response.data.user_id || response.data.hall_ticket_number || hallTicketNumber);
                setTimeout(() => {
                    navigate("/exam", {
                        state: {
                            sessionId: response.data.session_id,
                            hallTicketNumber: response.data.hall_ticket_number || hallTicketNumber,
                            userId: response.data.user_id || response.data.hall_ticket_number || hallTicketNumber
                        }
                    });
                }, 2000);
            }
        } catch (error) {
            setResult({
                success: false,
                access: "denied",
                message: "Verification failed. Check backend or console.",
            });
            console.error(error);
        }

        setLoading(false);
    };

    const retakeImage = () => {
        setCapturedImage(null);
        setCameraStopped(false);
        setResult(null);
        window.location.reload();
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

            <div className="container">
                <h1>Exam Verification</h1>

                <p className="subtitle">
                    Capture face image and verify candidate access
                </p>

                <div className="form-card">
                    <form onSubmit={handleVerify}>
                        <label>Hall Ticket Number</label>
                        <input
                            type="text"
                            placeholder="Enter Hall Ticket Number"
                            value={hallTicketNumber}
                            onChange={(e) => {
                                setHallTicketNumber(e.target.value);
                            }}
                            required
                        />

                        <label>Webcam Capture</label>

                        {!cameraStopped && (
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                width="100%"
                                videoConstraints={{
                                    facingMode: "user",
                                }}
                            />
                        )}

                        <br />
                        <br />

                        {!cameraStopped && (
                            <button type="button" onClick={captureImage}>
                                Capture Face
                            </button>
                        )}

                        {capturedImage && (
                            <>
                                <h3>Captured Image</h3>

                                <img
                                    src={capturedImage}
                                    alt="Captured face"
                                    style={{
                                        width: "100%",
                                        borderRadius: "10px",
                                        marginTop: "10px",
                                    }}
                                />

                                <br />
                                <br />

                                <button type="button" onClick={retakeImage}>
                                    Retake
                                </button>
                            </>
                        )}

                        <div style={{ marginTop: "20px" }}>
                            <label>Voice Verification Sample (10 seconds)</label>
                            <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "10px", flexWrap: "wrap" }}>
                                <button type="button" onClick={startRecording} disabled={recording || loading}>
                                    {recording ? `Recording... (${countdown}s)` : "Record 10s Voice Sample"}
                                </button>
                                {audioUrl && !recording && (
                                    <audio src={audioUrl} controls style={{ height: "40px" }} />
                                )}
                            </div>

                            <div style={{ marginTop: "15px" }}>
                                <label style={{ fontSize: "0.9em", color: "#666" }}>Or Upload Audio File</label>
                                <input
                                    type="file"
                                    accept=".wav,.mp3,.ogg"
                                    onChange={(e) => setUploadedAudioFile(e.target.files[0])}
                                    style={{ marginTop: "5px" }}
                                />
                            </div>
                        </div>

                        <br />
                        <br />

                        <button type="submit" disabled={loading}>
                            {loading ? "Verifying..." : "Verify Access"}
                        </button>
                    </form>

                    {loading && (
                        <div className="loader">
                            Verifying face and running liveness check...
                        </div>
                    )}
                </div>

                {result && (
                    <div
                        className={`card ${result.access === "granted"
                                ? "status-granted"
                                : "status-denied"
                            }`}
                    >
                        <h2>
                            {result.access === "granted"
                                ? "Access Granted"
                                : "Access Denied"}
                        </h2>

                        <p>
                            <strong>Message:</strong> {result.message}
                        </p>

                        {result.face_similarity !== undefined && (
                            <p>
                                <strong>Face Match Score:</strong>{" "}
                                {result.face_similarity.toFixed(4)}
                            </p>
                        )}

                        {result.voice_similarity !== undefined && (
                            <p>
                                <strong>Voice Match Score:</strong>{" "}
                                {result.voice_similarity.toFixed(4)}
                            </p>
                        )}

                        {result.blink_count !== undefined && (
                            <p>
                                <strong>Liveness Result:</strong> {result.blink_count}
                            </p>
                        )}

                        {result.access === "granted" && (
                            <p className="success">
                                Redirecting to exam page...
                            </p>
                        )}

                        <p>
                            <strong>Status:</strong>{" "}
                            {result.success ? "Success" : "Failed"}
                        </p>
                    </div>
                )}

                <br />

                <Link to="/">
                    <button>Back Home</button>
                </Link>
            </div>
        </>
    );
}

export default Verification;