import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import SignOutModal from './SignOutModal';
import firmityLogo from '../assets/firmity-logo.png';

export default function Navbar({ user, onLogout }) {
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);

  const handleConfirmSignOut = () => {
    setIsSignOutModalOpen(false);
    onLogout();
  };

  return (
    <>
      <header style={{
        background: '#336B93',
        borderBottom: '1px solid #285577',
        padding: '12px 32px',
        marginBottom: '28px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)'
      }}>
        <div style={{ maxWidth: '1360px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Brand - Firmity Logo in crisp white capsule for pristine contrast and brand fidelity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              background: '#FFFFFF',
              padding: '6px 14px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.4)'
            }}>
              <img
                src={firmityLogo}
                alt="Firmity"
                style={{
                  height: '40px',
                  width: 'auto',
                  display: 'block',
                  objectFit: 'contain'
                }}
              />
            </div>

            <div style={{ height: '24px', width: '1px', background: 'rgba(255, 255, 255, 0.3)' }} />

            <span style={{
              fontSize: '0.8125rem',
              fontWeight: '700',
              padding: '5px 12px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.16)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#FFFFFF',
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              Super Admin
            </span>
          </div>

          {/* Actions - High-visibility Sign Out */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setIsSignOutModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                background: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                color: '#DC2626',
                borderRadius: '8px',
                fontSize: '0.925rem',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#FEF2F2';
                e.currentTarget.style.color = '#B91C1C';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#FFFFFF';
                e.currentTarget.style.color = '#DC2626';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>

        </div>
      </header>

      <SignOutModal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
        onConfirm={handleConfirmSignOut}
      />
    </>
  );
}
