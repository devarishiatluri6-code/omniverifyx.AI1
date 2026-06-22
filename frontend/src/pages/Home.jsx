import { Link } from "react-router-dom";

function Home() {
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
                <h1>OmniVerifyX AI</h1>

                <p className="subtitle">
                    AI Powered Identity Verification System
                </p>

                <div style={{ marginTop: "30px" }}>
                    <h2>Candidate Portal</h2>
                    <div className="cards">
                        <div className="card">
                            <h2>Candidate Enrollment</h2>

                            <p>
                                Register candidates and capture biometric data.
                            </p>

                            <Link to="/enroll">
                                <button style={{ width: "100%" }}>Go to Enrollment</button>
                            </Link>
                        </div>

                        <div className="card">
                            <h2>Exam Verification</h2>

                            <p>
                                Verify using Hall Ticket Number.
                            </p>

                            <Link to="/verify">
                                <button style={{ width: "100%" }}>Go to Verification</button>
                            </Link>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: "40px", borderTop: "1px solid #ccc", paddingTop: "20px" }}>
                    <h2>Administration Portal</h2>
                    <div className="cards">
                        <div className="card">
                            <h2>Admin Login</h2>

                            <p>
                                Sign in as Administrator using secure credentials.
                            </p>

                            <Link to="/admin/login">
                                <button style={{ backgroundColor: "#007bff" }}>Go to Admin Login</button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Home;