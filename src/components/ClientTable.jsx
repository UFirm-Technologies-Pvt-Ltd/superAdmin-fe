import React from 'react';
import { Edit3, Trash2 } from 'lucide-react';

export default function ClientTable({
  clients = [],
  isLoading,
  onEdit,
  onDelete,
  onToggleStatus
}) {
  if (isLoading && clients.length === 0) {
    return (
      <div className="card-panel" style={{ padding: '56px 20px', textAlign: 'center', background: '#FFFFFF', borderColor: 'var(--border-strong)' }}>
        <div className="animate-spin" style={{
          width: '32px',
          height: '32px',
          border: '3px solid #E2E8F0',
          borderTopColor: 'var(--btn-primary-bg)',
          borderRadius: '50%',
          margin: '0 auto 14px'
        }} />
        <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Loading clients...</div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="card-panel" style={{ padding: '56px 20px', textAlign: 'center', background: '#FFFFFF', borderColor: 'var(--border-strong)' }}>
        <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '6px' }}>No clients found</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
          Try clearing search filters or add a new client.
        </p>
      </div>
    );
  }

  const formatDaysLeft = (validTill) => {
    if (!validTill) return null;
    const diff = Math.ceil((new Date(validTill) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: `Expired`, type: 'inactive' };
    if (diff <= 30) return { text: `${diff}d left`, type: 'warning' };
    return null;
  };

  return (
    <div className="card-panel" style={{ overflow: 'hidden', background: '#FFFFFF', borderColor: 'var(--border-strong)' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
          <thead>
            <tr style={{
              background: '#F1F5F9',
              borderBottom: '2px solid #CBD5E1',
              color: '#0F172A',
              fontSize: '0.875rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              <th style={{ padding: '16px 20px', width: '80px' }}>ID</th>
              <th style={{ padding: '16px 20px' }}>Client Name</th>
              <th style={{ padding: '16px 20px' }}>Host IP</th>
              <th style={{ padding: '16px 20px' }}>DB User</th>
              <th style={{ padding: '16px 20px' }}>Valid Until</th>
              <th style={{ padding: '16px 20px' }}>Status</th>
              <th style={{ padding: '16px 20px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => {
              const daysInfo = formatDaysLeft(client.validTill);
              const isActive = client.isActive && !client.isDeleted;

              return (
                <tr
                  key={client.propertyId}
                  style={{
                    borderBottom: '1px solid #E2E8F0',
                    transition: 'background-color 0.12s ease',
                    opacity: client.isDeleted ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {/* PropertyId */}
                  <td style={{ padding: '16px 20px', fontSize: '0.925rem', color: '#334155', fontFamily: 'monospace', fontWeight: '700' }}>
                    #{client.propertyId}
                  </td>

                  {/* Client Name & Master User */}
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: '700', fontSize: '1.05rem', color: '#0F172A' }}>
                      {client.clientName}
                    </div>
                    {client.masterUser && client.masterUser.email && (
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                          {client.masterUser.email}
                        </span>
                        {client.masterUser.canAddUsers ? (
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: '#EFF6FF',
                            color: '#1D4ED8',
                            border: '1px solid #BFDBFE'
                          }}>
                            Can Add Users
                          </span>
                        ) : null}
                      </div>
                    )}
                  </td>

                  {/* DB IP */}
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      display: 'inline-block',
                      fontFamily: 'monospace',
                      fontSize: '0.925rem',
                      fontWeight: '600',
                      color: '#0F172A',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      padding: '3px 8px',
                      borderRadius: '5px'
                    }}>
                      {client.dbIp || '—'}
                    </span>
                  </td>

                  {/* DB User */}
                  <td style={{ padding: '16px 20px', fontSize: '0.95rem', fontWeight: '600', color: '#1E293B' }}>
                    {client.dbUserName || '—'}
                  </td>

                  {/* Valid Till */}
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1E293B' }}>
                        {client.validTill ? new Date(client.validTill).toLocaleDateString() : '—'}
                      </span>
                      {daysInfo && (
                        <span className={`badge badge-${daysInfo.type}`} style={{ fontSize: '0.8rem', fontWeight: '700' }}>
                          {daysInfo.text}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status Toggle & Badge */}
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        onClick={() => onToggleStatus(client)}
                        title={isActive ? 'Click to deactivate' : 'Click to activate'}
                        style={{
                          width: '42px',
                          height: '24px',
                          borderRadius: '12px',
                          border: 'none',
                          background: isActive ? '#059669' : '#94A3B8',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'background-color 0.15s ease',
                          padding: '2px',
                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)'
                        }}
                      >
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: '#FFFFFF',
                          transform: isActive ? 'translateX(18px)' : 'translateX(0)',
                          transition: 'transform 0.15s ease',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.25)'
                        }} />
                      </button>

                      <span className={`badge ${isActive ? 'badge-active' : 'badge-inactive'}`} style={{ fontSize: '0.825rem', padding: '4px 10px' }}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        onClick={() => onEdit(client)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 14px',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          background: '#EBF3F8',
                          border: '1.5px solid #CCE0EE',
                          color: '#285577',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = '#DCE9F3';
                          e.currentTarget.style.borderColor = '#B2D1E5';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = '#EBF3F8';
                          e.currentTarget.style.borderColor = '#CCE0EE';
                        }}
                        title="Edit client"
                      >
                        <Edit3 size={15} />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => onDelete(client)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '7px 12px',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          background: '#FEF2F2',
                          border: '1.5px solid #FECACA',
                          color: '#DC2626',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = '#FEE2E2';
                          e.currentTarget.style.borderColor = '#FCA5A5';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = '#FEF2F2';
                          e.currentTarget.style.borderColor = '#FECACA';
                        }}
                        title="Deactivate client"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
