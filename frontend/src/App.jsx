import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Enrollment from "./pages/Enrollment";
import Verification from "./pages/Verification";
import Exam from "./pages/Exam";
import AdminDashboard from "./pages/AdminDashboard";
import Report from "./pages/Report";
import AdminLogin from "./pages/AdminLogin";
import AdminExams from "./pages/AdminExams";
import HallTickets from "./pages/HallTickets";
import LiveMonitoring from "./pages/LiveMonitoring";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/enroll" element={<Enrollment />} />
      <Route path="/verify" element={<Verification />} />
      <Route path="/exam" element={<Exam />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/report/:sessionId" element={<Report />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/admin/exams" element={<AdminExams />} />
      <Route path="/admin/hall-tickets" element={<HallTickets />} />
      <Route path="/admin/live-monitoring" element={<LiveMonitoring />} />
    </Routes>
  );
}

export default App;