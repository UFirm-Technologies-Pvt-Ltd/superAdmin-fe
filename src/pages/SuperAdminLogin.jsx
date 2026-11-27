import React, { useState, useEffect, useRef } from 'react';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import firmityLogo from '../assets/firmity-logo.png';

function formatCountdown(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds) || 0);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function SuperAdminLogin({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 2FA challenge state (kept strictly in component memory, never persisted to storage)
  const [step, setStep] = useState('credentials'); // 'credentials' | '2fa'
  const [challenge, setChallenge] = useState(null); // { ticket, maskedContactNumber }
  const [otp, setOtp] = useState('');
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [infoMessage, setInfoMessage] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const otpInputRef = useRef(null);

  // Countdown tick for OTP expiry & resend cooldown
  useEffect(() => {
    if (step !== '2fa') return;
    if (otpExpiresIn <= 0 && resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setOtpExpiresIn((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [step, otpExpiresIn, resendCooldown]);

  useEffect(() => {
    if (step === '2fa' && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  const resetToCredentials = (errorMessage = '') => {
    setStep('credentials');
    setChallenge(null);
    setOtp('');
    setOtpExpiresIn(0);
    setResendCooldown(0);
    setInfoMessage('');
    setError(errorMessage);
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setInfoMessage('');
    setIsLoading(true);

    try {
      const data = await api.login(email.trim(), password);
      if (data?.requires2Fa) {
        setChallenge({
          ticket: data.twoFactorTicket,
          maskedContactNumber: data.maskedContactNumber || ''
        });
        setOtp('');
        setOtpExpiresIn(Number(data.expiresInSeconds) > 0 ? Number(data.expiresInSeconds) : 0);
        setResendCooldown(Number(data.resendCooldownSeconds) > 0 ? Number(data.resendCooldownSeconds) : 0);
        setInfoMessage(data.message || 'Verification code has been sent to your registered mobile number.');
        setStep('2fa');
        return;
      }

      onLoginSuccess(data.user, data.accessToken);
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(digitsOnly);
    if (error) setError('');
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (isLoading || !challenge?.ticket) return;

    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const data = await api.verifyTwoFactor(challenge.ticket, cleanOtp);
      onLoginSuccess(data.user, data.accessToken);
    } catch (err) {
      if (err.status === 401 || err.data?.error === 'INVALID_OR_EXPIRED_TICKET') {
        resetToCredentials(err.message || 'Your verification session has expired. Please sign in again.');
        return;
      }
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (isResending || isLoading || resendCooldown > 0 || !challenge?.ticket) return;

    setError('');
    setIsResending(true);

    try {
      const data = await api.resendTwoFactor(challenge.ticket);
      setOtp('');
      if (Number(data?.expiresInSeconds) > 0) {
        setOtpExpiresIn(Number(data.expiresInSeconds));
      }
      if (data?.maskedContactNumber) {
        setChallenge((prev) => (prev ? { ...prev, maskedContactNumber: data.maskedContactNumber } : prev));
      }
      setResendCooldown(Number(data?.resendCooldownSeconds) > 0 ? Number(data.resendCooldownSeconds) : 0);
      setInfoMessage(data?.message || 'A new verification code has been sent to your mobile number.');
      otpInputRef.current?.focus();
    } catch (err) {
      if (err.status === 401 || err.data?.error === 'INVALID_OR_EXPIRED_TICKET') {
        resetToCredentials(err.message || 'Your verification session has expired. Please sign in again.');
        return;
      }
      if (err.status === 429 && Number(err.data?.retryAfterSeconds) > 0) {
        setResendCooldown(Number(err.data.retryAfterSeconds));
      }
      setError(err.message || 'Could not resend verification code.');
    } finally {
      setIsResending(false);
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
            {step === '2fa' ? 'Two-Factor Verification' : 'Super Admin Console'}
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            {step === '2fa'
              ? (challenge?.maskedContactNumber
                  ? `Enter the 6-digit code sent to ${challenge.maskedContactNumber}`
                  : 'Enter the 6-digit verification code sent to your mobile')
              : 'Sign in to manage client databases'}
          </p>
        </div>

        {/* Info Alert */}
        {step === '2fa' && infoMessage && !error && (
          <div style={{
            padding: '12px 16px',
            background: '#EFF6FF',
            border: '1px solid #DBEAFE',
            borderRadius: 'var(--radius-md)',
            color: '#1D4ED8',
            fontSize: '0.88rem',
            marginBottom: '20px'
          }}>
            {infoMessage}
          </div>
        )}

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

        {step === 'credentials' ? (
          <form onSubmit={handleCredentialsSubmit}>
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
                    disabled={isLoading}
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
                    disabled={isLoading}
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
        ) : (
          <form onSubmit={handleVerifySubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                    6-Digit Verification Code
                  </label>
                  {otpExpiresIn > 0 ? (
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                      Expires in {formatCountdown(otpExpiresIn)}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.82rem', color: '#DC2626', fontWeight: '500' }}>
                      Code expired
                    </span>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <ShieldCheck size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    ref={otpInputRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    className="form-input"
                    value={otp}
                    onChange={handleOtpChange}
                    style={{
                      padding: '11px 12px 11px 38px',
                      fontSize: '1.15rem',
                      letterSpacing: '0.35em',
                      fontWeight: '600',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '11px', fontSize: '1rem', marginBottom: '14px' }}
              disabled={isLoading || otp.length !== 6}
            >
              {isLoading ? 'Verifying...' : 'Verify & Sign In'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
              <button
                type="button"
                onClick={() => resetToCredentials('')}
                disabled={isLoading || isResending}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px 0'
                }}
              >
                <ArrowLeft size={15} />
                Back to Sign In
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isLoading || isResending || resendCooldown > 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'none',
                  border: 'none',
                  color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--primary)',
                  fontWeight: '500',
                  cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                  padding: '4px 0',
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                <RefreshCw size={14} className={isResending ? 'animate-spin' : ''} />
                {isResending
                  ? 'Sending...'
                  : resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : 'Resend Code'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
