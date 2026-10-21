import React from 'react';
import { LogOut, X } from 'lucide-react';

export default function SignOutModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.45)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="card-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '400px',
        background: '#FFFFFF',
        borderColor: 'var(--border-strong)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        padding: '22px'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#FEF2F2',
              border: '1.5px solid #FECACA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#DC2626'
            }}>
              <LogOut size={20} />
            </div>
            <h3 style={{ fontSize: '1.25rem', color: '#0F172A', fontWeight: '700' }}>
              Sign Out
            </h3>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#475569',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Message - Concise & Clear */}
        <p style={{ color: '#1E293B', fontSize: '1.05rem', fontWeight: '500', lineHeight: '1.5', marginBottom: '22px' }}>
          Are you sure you want to sign out?
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '9px 18px', fontSize: '0.95rem', fontWeight: '600' }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 20px',
              fontSize: '0.95rem',
              fontWeight: '700',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid #B91C1C',
              cursor: 'pointer',
              color: '#FFFFFF',
              background: '#DC2626',
              boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#B91C1C';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#DC2626';
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>

      </div>
    </div>
  );
}
