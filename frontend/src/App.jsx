import { Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import Enrollment from "./pages/Enrollment";
import Verification from "./pages/Verification";
import Exam from "./pages/Exam";
import AdminDashboard from "./pages/AdminDashboard";
import Report from "./pages/Report";
import Login from "./pages/Login";
import AdminExams from "./pages/AdminExams";
import HallTickets from "./pages/HallTickets";
import LiveMonitoring from "./pages/LiveMonitoring";
import DocumentVerification from "./pages/DocumentVerification";
import ProctoringLogs from "./pages/ProctoringLogs";
import CandidateDashboard from "./pages/CandidateDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import HallTicketPreview from "./pages/HallTicketPreview";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Home />} />
      <Route path="/enroll" element={<Enrollment />} />
      <Route path="/verify" element={<Verification />} />
      <Route path="/exam" element={<Exam />} />
      
      {/* Unified Role Login */}
      <Route path="/login" element={<Login />} />
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />
      <Route path="/admin-login" element={<Navigate to="/login" replace />} />
      
      {/* Protected Admin Routes */}
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/exams" element={<AdminExams />} />
        <Route path="/admin/hall-tickets" element={<HallTickets />} />
        <Route path="/admin/live-monitoring" element={<LiveMonitoring />} />
        <Route path="/admin/verify-docs" element={<DocumentVerification />} />
        <Route path="/admin/proctoring-logs" element={<ProctoringLogs />} />
        <Route path="/analytics" element={<AdminDashboard />} />
        <Route path="/report/:sessionId" element={<Report />} />
      </Route>

      {/* Protected Candidate Routes */}
      <Route element={<ProtectedRoute allowedRoles={["candidate"]} />}>
        <Route path="/candidate" element={<Navigate to="/candidate/dashboard" replace />} />
        <Route path="/candidate/dashboard" element={<CandidateDashboard />} />
        <Route path="/candidate/hall-ticket" element={<HallTicketPreview />} />
        <Route path="/candidate/hall-ticket/:ticketNumber" element={<HallTicketPreview />} />
      </Route>

      {/* Protected Student Routes */}
      <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
        <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
      </Route>

      {/* Wildcard Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;