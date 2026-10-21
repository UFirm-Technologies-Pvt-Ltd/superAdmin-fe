import React from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

export default function StatusModal({
  isOpen,
  onClose,
  onConfirm,
  client,
  isLoading
}) {
  if (!isOpen || !client) return null;

  const willActivate = !client.isActive;

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
        maxWidth: '420px',
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
              background: willActivate ? '#ECFDF5' : '#FFFBEB',
              border: `1.5px solid ${willActivate ? '#A7F3D0' : '#FDE68A'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: willActivate ? '#059669' : '#D97706'
            }}>
              {willActivate ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
            </div>
            <h3 style={{ fontSize: '1.25rem', color: '#0F172A', fontWeight: '700' }}>
              {willActivate ? 'Activate Client' : 'Deactivate Client'}
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

        {/* Message - Concise & Direct */}
        <p style={{ color: '#1E293B', fontSize: '1.05rem', fontWeight: '500', lineHeight: '1.5', marginBottom: '22px' }}>
          {willActivate ? (
            <>
              Activate access for <strong style={{ color: '#0F172A', fontWeight: '700' }}>{client.clientName}</strong>?
            </>
          ) : (
            <>
              Deactivate access for <strong style={{ color: '#0F172A', fontWeight: '700' }}>{client.clientName}</strong>?
            </>
          )}
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={isLoading}
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
              padding: '9px 22px',
              fontSize: '0.95rem',
              fontWeight: '700',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid transparent',
              cursor: 'pointer',
              color: '#FFFFFF',
              background: willActivate ? '#059669' : '#D97706',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              transition: 'background-color 0.15s ease'
            }}
            disabled={isLoading}
            onMouseEnter={e => {
              e.currentTarget.style.background = willActivate ? '#047857' : '#B45309';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = willActivate ? '#059669' : '#D97706';
            }}
          >
            {isLoading
              ? 'Saving...'
              : (willActivate ? 'Activate' : 'Deactivate')}
          </button>
        </div>

      </div>
    </div>
  );
}
