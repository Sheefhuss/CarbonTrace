import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './context/authStore';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import QuizPage from './pages/QuizPage';
import DashboardPage from './pages/DashboardPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
const ProtectedRoute = ({ children }) => {
  const { token, isInitializing } = useAuthStore();

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-forest-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace />;
  return children; // ← no CarbonBot here anymore
};

function App() {
  const initialize = useAuthStore(state => state.initialize);

  useEffect(() => {
    initialize();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route path="/quiz" element={
          <ProtectedRoute><QuizPage /></ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
          // DashboardPage renders CarbonBot internally with user + emissions
        } />
      </Routes>
    </Router>
  );
}

export default App;
