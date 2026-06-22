import { Routes, Route, Navigate } from "react-router-dom";

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
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/enroll" element={<Enrollment />} />
      <Route path="/verify" element={<Verification />} />
      <Route path="/exam" element={<Exam />} />
      
      {/* Protected Admin Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/exams" element={<AdminExams />} />
        <Route path="/admin/hall-tickets" element={<HallTickets />} />
        <Route path="/admin/live-monitoring" element={<LiveMonitoring />} />
        <Route path="/analytics" element={<AdminDashboard />} />
        <Route path="/report/:sessionId" element={<Report />} />
      </Route>

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin-login" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
}

export default App;