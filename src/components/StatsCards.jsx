import React from 'react';
import { Database, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function StatsCards({ clients = [] }) {
  const total = clients.length;
  const active = clients.filter(c => c.isActive && !c.isDeleted).length;
  const inactive = clients.filter(c => !c.isActive || c.isDeleted).length;

  const now = new Date();
  const expiringSoon = clients.filter(c => {
    if (!c.validTill) return false;
    const diffDays = Math.ceil((new Date(c.validTill) - now) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  }).length;

  const cards = [
    {
      title: 'Total Clients',
      value: total,
      icon: Database,
      color: '#336B93',
      iconBg: '#EBF3F8',
      iconBorder: '#CCE0EE'
    },
    {
      title: 'Active Clients',
      value: active,
      icon: CheckCircle2,
      color: '#059669',
      iconBg: '#ECFDF5',
      iconBorder: '#A7F3D0'
    },
    {
      title: 'Inactive Clients',
      value: inactive,
      icon: XCircle,
      color: '#475569',
      iconBg: '#F1F5F9',
      iconBorder: '#CBD5E1'
    },
    {
      title: 'Expiring Soon (30d)',
      value: expiringSoon,
      icon: Clock,
      color: expiringSoon > 0 ? '#B45309' : '#64748B',
      iconBg: expiringSoon > 0 ? '#FFFBEB' : '#F8FAFC',
      iconBorder: expiringSoon > 0 ? '#FDE68A' : '#E2E8F0'
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '18px',
      marginBottom: '26px'
    }}>
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div key={i} className="card-panel card-panel-hover" style={{ padding: '22px 24px', background: '#FFFFFF', borderColor: 'var(--border-strong)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {card.title}
              </span>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: card.iconBg,
                border: `1.5px solid ${card.iconBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon size={22} color={card.color} />
              </div>
            </div>

            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#0F172A', lineHeight: 1 }}>
              {card.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
