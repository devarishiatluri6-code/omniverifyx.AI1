import { Link } from "react-router-dom";

function Home() {
  const isDemoActive = localStorage.getItem("demo_mode_active") === "true";

  return (
    <>
      {isDemoActive && (
        <div className="demo-banner">
          <span>⚠️</span>
          <strong>Demo Mode Active: Offline Engines Enabled</strong>
        </div>
      )}

      {/* Modern Top Header / Navbar */}
      <div className="navbar">
        <h2>OmniVerifyX AI</h2>
        <div>
          <Link to="/" className="active-link">Home</Link>
          <Link to="/enroll">Enroll</Link>
          <Link to="/verify">Verify</Link>
          <Link to="/login">Login</Link>
        </div>
      </div>

      {/* Main SaaS Container */}
      <div className="container" style={{ maxWidth: "1200px", padding: "60px 20px" }}>
        
        {/* HERO SECTION */}
        <div className="hero" style={{ textAlign: "center", padding: "80px 40px", marginBottom: "60px", background: "linear-gradient(135deg, #ffffff, #f8fafc)", border: "1px solid var(--border-color)", borderRadius: "24px", boxShadow: "var(--shadow-md)" }}>
          <span style={{ display: "inline-block", padding: "6px 16px", backgroundColor: "var(--primary-light)", color: "var(--primary-color)", borderRadius: "9999px", fontSize: "0.85rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "20px" }}>
            Internship Submission Build v1.0.0
          </span>
          <h1 style={{ fontSize: "3.2rem", color: "#0f172a", lineHeight: "1.15", fontWeight: "800", fontFamily: "var(--font-heading)" }}>
            AI-Powered Identity Verification & <span style={{ color: "transparent", background: "linear-gradient(to right, #2563eb, #4f46e5)", WebkitBackgroundClip: "text" }}>Exam Integrity Platform</span>
          </h1>
          <p className="subtitle" style={{ fontSize: "1.2rem", maxWidth: "800px", margin: "20px auto 35px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
            Secure candidate onboarding, biometric verification, document validation, and AI-assisted proctoring.
          </p>

          <div style={{ display: "flex", gap: "15px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/enroll">
              <button style={{ padding: "14px 28px", fontSize: "1rem", backgroundColor: "var(--primary-color)" }}>
                Start Candidate Enrollment
              </button>
            </Link>
            <Link to="/login">
              <button style={{ padding: "14px 28px", fontSize: "1rem", backgroundColor: "var(--indigo)" }}>
                Access Portal Login
              </button>
            </Link>
            <Link to="/verify">
              <button style={{ padding: "14px 28px", fontSize: "1rem", backgroundColor: "#0f172a", border: "1px solid #1e293b" }}>
                Verify Admit Card
              </button>
            </Link>
          </div>
        </div>

        {/* SECTION 1: FEATURES SECTION */}
        <div style={{ marginBottom: "70px", textAlign: "center" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: "700", fontFamily: "var(--font-heading)", color: "#0f172a", marginBottom: "8px" }}>
            Cutting-Edge Integrity Features
          </h2>
          <p style={{ color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto 40px" }}>
            Harnessing state-of-the-art vision and speech architectures to create bulletproof exams.
          </p>

          <div className="cards">
            {/* Feature 1 */}
            <div className="card" style={{ borderTop: "4px solid var(--primary-color)" }}>
              <div style={{ width: "45px", height: "45px", borderRadius: "10px", backgroundColor: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary-color)", marginBottom: "15px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <h2>Dynamic OCR Validation</h2>
              <p>Automatically scans Aadhaar, Caste and Income certificates using EasyOCR. Cross-references registration names and thresholds with 99.8% precision.</p>
            </div>

            {/* Feature 2 */}
            <div className="card" style={{ borderTop: "4px solid var(--indigo)" }}>
              <div style={{ width: "45px", height: "45px", borderRadius: "10px", backgroundColor: "var(--indigo-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--indigo)", marginBottom: "15px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <h2>Multi-Modal Biometrics</h2>
              <p>Integrates advanced voiceprint verification (WavLM model embeddings) and face matching algorithm weights to block proxy test takers.</p>
            </div>

            {/* Feature 3 */}
            <div className="card" style={{ borderTop: "4px solid var(--success)" }}>
              <div style={{ width: "45px", height: "45px", borderRadius: "10px", backgroundColor: "var(--success-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--success)", marginBottom: "15px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </div>
              <h2>Blink & Liveness Check</h2>
              <p>Evaluates candidates in real-time. Head-turns and blink tracking powered by MediaPipe Face Mesh guarantee candidate presence.</p>
            </div>

            {/* Feature 4 */}
            <div className="card" style={{ borderTop: "4px solid var(--warning)" }}>
              <div style={{ width: "45px", height: "45px", borderRadius: "10px", backgroundColor: "var(--warning-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--warning)", marginBottom: "15px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <h2>YOLO Active Proctoring</h2>
              <p>Exposes proctor violations during tests, tracing mobile phone presence, secondary monitor access, face counts, and talking alerts.</p>
            </div>
          </div>
        </div>

        {/* SECTION 2: HOW IT WORKS SECTION */}
        <div style={{ marginBottom: "70px", backgroundColor: "white", padding: "50px 30px", borderRadius: "20px", border: "1px solid var(--border-color)" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: "700", fontFamily: "var(--font-heading)", color: "#0f172a", textAlign: "center", marginBottom: "40px" }}>
            How OmniVerifyX Works
          </h2>

          <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: "30px" }}>
            {[
              { step: "01", title: "Enrolment Wizard", desc: "Submit details, run dynamic OCR, capture face and record a 10s voice sample." },
              { step: "02", title: "Admit Card Issued", desc: "Generate a secure PDF admit card linked with a high-fidelity verification QR." },
              { step: "03", title: "Verify Exam Access", desc: "Scan QR and re-validate voice/face before entering the exam window." },
              { step: "04", title: "Integrity Proctored Exam", desc: "Take the exam securely under active computer vision monitoring and logs." }
            ].map((item, idx) => (
              <div key={idx} style={{ flex: 1, minWidth: "220px", textAlign: "left" }}>
                <div style={{ fontSize: "2.5rem", fontWeight: "800", color: "var(--primary-color)", opacity: 0.25, fontFamily: "var(--font-heading)" }}>
                  {item.step}
                </div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: "700", margin: "8px 0", color: "#0f172a" }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: TECHNOLOGY STACK */}
        <div style={{ marginBottom: "70px", textAlign: "center" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: "700", fontFamily: "var(--font-heading)", color: "#0f172a", marginBottom: "8px" }}>
            Engineered Technology Stack
          </h2>
          <p style={{ color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto 40px" }}>
            Powered by modern open-source models, libraries, and frameworks for extreme speed and precision.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
            {[
              { category: "Frontend Engine", tools: ["React v19", "Vite JS", "Recharts", "Webcam API"] },
              { category: "Backend Framework", tools: ["FastAPI (Python)", "SQLite DB", "SQLAlchemy", "Uvicorn"] },
              { category: "Computer Vision", tools: ["YOLOv8 Objects", "MediaPipe Mesh", "OpenCV Image"] },
              { category: "Speech Analytics", tools: ["SpeechBrain", "WavLM Model", "SoundFile & Librosa"] },
              { category: "Document OCR", tools: ["EasyOCR Parser", "ReportLab PDF", "QR Code Generator"] }
            ].map((tech, idx) => (
              <div key={idx} className="card" style={{ padding: "20px", textAlign: "center" }}>
                <strong style={{ display: "block", color: "var(--primary-color)", fontSize: "0.95rem", marginBottom: "10px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
                  {tech.category}
                </strong>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {tech.tools.map((tool) => (
                    <span key={tool} style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>{tool}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4: BENEFITS */}
        <div style={{ marginBottom: "70px", textAlign: "center" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: "700", fontFamily: "var(--font-heading)", color: "#0f172a", marginBottom: "40px" }}>
            Why Institutions Trust OmniVerifyX AI
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", textAlign: "left", flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", gap: "15px" }}>
                <span style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "var(--success-light)", color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>✓</span>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>Seamless Academic Verification</h3>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Verify students across state metrics and reservation categories using customized rules.</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "15px" }}>
                <span style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "var(--success-light)", color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>✓</span>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>Mitigate Exam Impersonation</h3>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Biometric parameters coupled with liveness validation block fake identities.</p>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", gap: "15px" }}>
                <span style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "var(--success-light)", color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>✓</span>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>Instant Integrity Reports</h3>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Verify student proctor violations (risk score metrics and charts) immediately upon test submission.</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "15px" }}>
                <span style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "var(--success-light)", color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>✓</span>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>Instituted Compliance Checks</h3>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Automatically matches date of birth, caste certifications, and income level to assure eligibility.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* FOOTER */}
      <div style={{ backgroundColor: "#0f172a", color: "#94a3b8", padding: "40px 20px", marginTop: "40px", borderTop: "1px solid #1e293b", fontSize: "0.9rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "30px", textAlign: "left" }}>
          <div>
            <h3 style={{ color: "#fff", fontFamily: "var(--font-heading)", fontWeight: "700", marginBottom: "10px" }}>OmniVerifyX AI</h3>
            <p style={{ maxWidth: "300px", color: "#64748b" }}>An AI proctored examination and multi-modal biometric onboarding submission build.</p>
          </div>
          <div>
            <h4 style={{ color: "#fff", marginBottom: "12px" }}>Product</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Link to="/enroll" style={{ color: "#64748b", textDecoration: "none" }}>Enrollment</Link>
              <Link to="/verify" style={{ color: "#64748b", textDecoration: "none" }}>Verification</Link>
            </div>
          </div>
          <div>
            <h4 style={{ color: "#fff", marginBottom: "12px" }}>Credentials</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Link to="/login" style={{ color: "#64748b", textDecoration: "none" }}>Access Portal Login</Link>
              <span style={{ color: "#475569", fontSize: "0.8rem" }}>Admin: admin@omniverifyx.ai</span>
              <span style={{ color: "#475569", fontSize: "0.8rem" }}>Student: student@omniverifyx.ai</span>
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid #1e293b", marginTop: "30px", paddingTop: "20px", textAlign: "center", color: "#475569" }}>
          &copy; {new Date().getFullYear()} OmniVerifyX AI. Created for Internship Submission at Tekisho Info Tech.
        </div>
      </div>
    </>
  );
}

export default Home;