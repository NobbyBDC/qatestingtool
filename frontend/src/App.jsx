import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ZapSecurity from './pages/ZapSecurity';
import SonarQube from './pages/SonarQube';
import Accessibility from './pages/Accessibility';
import SeoAudit from './pages/SeoAudit';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="security" element={<ZapSecurity />} />
          <Route path="sonarqube" element={<SonarQube />} />
          <Route path="accessibility" element={<Accessibility />} />
          <Route path="seo" element={<SeoAudit />} />
          <Route
            path="admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
