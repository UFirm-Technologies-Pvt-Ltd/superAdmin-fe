import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  client,
  isLoading
}) {
  if (!isOpen || !client) return null;

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
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        padding: '22px'
      }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
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
            <AlertTriangle size={20} />
          </div>
          <h3 style={{ fontSize: '1.25rem', color: '#0F172A', fontWeight: '700' }}>
            Deactivate Client
          </h3>
        </div>

        <p style={{ color: '#1E293B', fontSize: '1.05rem', fontWeight: '500', lineHeight: '1.5', marginBottom: '22px' }}>
          Deactivate access for <strong style={{ color: '#0F172A', fontWeight: '700' }}>{client.clientName}</strong>?
        </p>

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
            className="btn-danger"
            disabled={isLoading}
            style={{ padding: '9px 22px', fontSize: '0.95rem', fontWeight: '700', boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)' }}
          >
            {isLoading ? 'Saving...' : 'Deactivate'}
          </button>
        </div>

      </div>
    </div>
  );
}
