import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'
import TermsOfService from './pages/TermsOfService.jsx'
import { getToken } from './api.js'

function ProtectedRoute() {
  return getToken() ? <AdminDashboard /> : <Navigate to="/admin" replace />
}

function LoginRoute() {
  return getToken() ? <Navigate to="/admin/dashboard" replace /> : <AdminLogin />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/admin" element={<LoginRoute />} />
      <Route path="/admin/dashboard" element={<ProtectedRoute />} />
      <Route path="/admin/:section" element={<ProtectedRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App