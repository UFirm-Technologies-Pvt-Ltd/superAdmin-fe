import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { api } from '../api/client';
import firmityLogo from '../assets/firmity-logo.png';

export default function SuperAdminLogin({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await api.login(email.trim(), password);
      onLoginSuccess(data.user, data.accessToken);
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'var(--bg-page)'
    }}>
      <div className="card-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '40px 36px',
        background: '#FFFFFF',
        borderColor: 'var(--border-strong)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img
            src={firmityLogo}
            alt="Firmity"
            style={{
              height: '52px',
              width: 'auto',
              margin: '0 auto 16px',
              display: 'block',
              objectFit: 'contain'
            }}
          />

          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Super Admin Console
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Sign in to manage client databases
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            padding: '12px 16px',
            background: '#FEF2F2',
            border: '1px solid #FEE2E2',
            borderRadius: 'var(--radius-md)',
            color: '#DC2626',
            fontSize: '0.9rem',
            marginBottom: '22px'
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '26px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '7px' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="form-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ paddingLeft: '38px', fontSize: '0.95rem', padding: '10px 12px 10px 38px' }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '7px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="form-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingLeft: '38px', paddingRight: '40px', fontSize: '0.95rem', padding: '10px 40px 10px 38px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: '11px', fontSize: '1rem' }}
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
