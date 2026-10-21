import React, { useState, useEffect } from 'react';
import SuperAdminLogin from './pages/SuperAdminLogin';
import ClientDashboard from './pages/ClientDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import { getToken, getCurrentUser, api } from './api/client';

export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Check initial session
    const token = getToken();
    const storedUser = getCurrentUser();

    if (token && storedUser) {
      setUser(storedUser);
      setIsAuthenticated(true);
    }
    setIsInitializing(false);

    // Listen for unauthorized events from api client
    const handleUnauthorized = () => {
      setUser(null);
      setIsAuthenticated(false);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const handleLoginSuccess = (userData, token) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  if (isInitializing) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        color: 'var(--text-muted)'
      }}>
        <div className="animate-spin" style={{
          width: '28px',
          height: '28px',
          border: '2px solid #E2E8F0',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%'
        }} />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app-container">
        {isAuthenticated ? (
          <ClientDashboard user={user} onLogout={handleLogout} />
        ) : (
          <SuperAdminLogin onLoginSuccess={handleLoginSuccess} />
        )}
      </div>
    </ErrorBoundary>
  );
}
