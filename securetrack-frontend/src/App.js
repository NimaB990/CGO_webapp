import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './pages/SignIn';
import SidebarLayout from './components/SidebarLayout';
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
import AdminPanel from './pages/AdminPanel';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import DriverDashboard from './pages/DriverDashboard';

/**
 * RequireAuth
 * ------------
 * Minimal client-side route guard: if there's no JWT in localStorage,
 * bounce back to the sign-in page. The Spring Boot backend must still
 * validate the JWT on every API call — this only protects the UI shell.
 */
function RequireAuth({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public: sign-in screen */}
        <Route path="/" element={<SignIn />} />

        {/* Protected: main application shell with nested pages */}
        <Route
          path="/app"
          element={
            <RequireAuth>
              <SidebarLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="admin" element={<AdminPanel />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="driver" element={<DriverDashboard />} />
        </Route>

        {/* Fallback: any unknown URL redirects to sign-in */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
