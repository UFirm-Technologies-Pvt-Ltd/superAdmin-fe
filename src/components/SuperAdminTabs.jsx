import React from 'react';
import { Database, ShieldCheck, Hourglass } from 'lucide-react';

export default function SuperAdminTabs({ activeTab, onTabChange }) {
  const tabs = [
    {
      id: 'clients',
      label: 'Clients & Infrastructure',
      icon: Database
    },
    {
      id: 'paid',
      label: 'Paid Subscriptions',
      icon: ShieldCheck
    },
    {
      id: 'trials',
      label: 'Trial Management',
      icon: Hourglass
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '12px',
      marginBottom: '22px'
    }}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 18px',
              borderRadius: '10px',
              border: isActive ? '2px solid #336B93' : '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              textAlign: 'left',
              boxShadow: isActive ? '0 3px 8px rgba(51, 107, 147, 0.12)' : '0 1px 2px rgba(0, 0, 0, 0.03)',
              position: 'relative'
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: isActive ? '#336B93' : '#F1F5F9',
              color: isActive ? '#FFFFFF' : '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Icon size={19} />
            </div>

            <div style={{
              fontSize: '0.95rem',
              fontWeight: isActive ? '700' : '600',
              color: isActive ? '#0F172A' : '#475569',
              letterSpacing: '-0.01em'
            }}>
              {tab.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}
