import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '12px 18px',
      background: '#FFFFFF',
      border: '1.5px solid #CBD5E1',
      color: '#0F172A',
      borderRadius: 'var(--radius-md)',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
      fontSize: '0.95rem',
      fontWeight: '600',
      maxWidth: '420px',
      animation: 'fadeIn 0.2s ease'
    }}>
      {isSuccess && <CheckCircle2 size={20} color="#059669" />}
      {isError && <AlertCircle size={20} color="#DC2626" />}
      {!isSuccess && !isError && <Info size={20} color="#336B93" />}

      <span style={{ flex: 1 }}>{toast.message}</span>

      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: '#475569',
          cursor: 'pointer',
          padding: '2px',
          display: 'flex'
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
