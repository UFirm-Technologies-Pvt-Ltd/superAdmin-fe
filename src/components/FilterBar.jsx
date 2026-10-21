import React from 'react';
import { Search, Plus, RefreshCw } from 'lucide-react';

export default function FilterBar({
  search,
  onSearchChange,
  activeFilter, // null, true, false
  onFilterChange,
  onRefresh,
  onOpenCreateModal,
  isLoading
}) {
  return (
    <div className="card-panel" style={{ padding: '16px 20px', marginBottom: '22px', background: '#FFFFFF', borderColor: 'var(--border-strong)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        
        {/* Search & Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', flex: '1', minWidth: '320px' }}>
          
          {/* Search Box */}
          <div style={{ position: 'relative', width: '300px', maxWidth: '100%' }}>
            <Search size={18} color="#475569" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search clients..."
              className="form-input"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                paddingLeft: '42px',
                fontSize: '0.95rem',
                fontWeight: '600',
                padding: '10px 14px 10px 42px',
                border: '1.5px solid #CBD5E1',
                color: '#0F172A'
              }}
            />
            {search && (
              <button
                onClick={() => onSearchChange('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#475569',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  padding: '2px'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Active/Inactive Filter Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#E2E8F0',
            border: '1.5px solid #CBD5E1',
            borderRadius: '8px',
            padding: '4px'
          }}>
            <button
              onClick={() => onFilterChange(null)}
              style={{
                padding: '7px 18px',
                borderRadius: '6px',
                border: activeFilter === null ? '1.5px solid #CBD5E1' : '1.5px solid transparent',
                background: activeFilter === null ? '#FFFFFF' : 'transparent',
                color: activeFilter === null ? '#0F172A' : '#475569',
                fontWeight: activeFilter === null ? '700' : '600',
                fontSize: '0.925rem',
                cursor: 'pointer',
                boxShadow: activeFilter === null ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              All
            </button>
            <button
              onClick={() => onFilterChange(true)}
              style={{
                padding: '7px 18px',
                borderRadius: '6px',
                border: activeFilter === true ? '1.5px solid #6EE7B7' : '1.5px solid transparent',
                background: activeFilter === true ? '#FFFFFF' : 'transparent',
                color: activeFilter === true ? '#047857' : '#475569',
                fontWeight: activeFilter === true ? '700' : '600',
                fontSize: '0.925rem',
                cursor: 'pointer',
                boxShadow: activeFilter === true ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Active
            </button>
            <button
              onClick={() => onFilterChange(false)}
              style={{
                padding: '7px 18px',
                borderRadius: '6px',
                border: activeFilter === false ? '1.5px solid #CBD5E1' : '1.5px solid transparent',
                background: activeFilter === false ? '#FFFFFF' : 'transparent',
                color: activeFilter === false ? '#334155' : '#475569',
                fontWeight: activeFilter === false ? '700' : '600',
                fontSize: '0.925rem',
                cursor: 'pointer',
                boxShadow: activeFilter === false ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Inactive
            </button>
          </div>

        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onRefresh}
            className="btn-secondary"
            disabled={isLoading}
            title="Reload clients"
            style={{ padding: '10px 18px', fontSize: '0.95rem', fontWeight: '600' }}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={onOpenCreateModal}
            className="btn-primary"
            style={{
              padding: '10px 22px',
              fontSize: '0.95rem',
              fontWeight: '700',
              background: '#336B93',
              borderColor: '#285577',
              boxShadow: '0 2px 4px rgba(51, 107, 147, 0.28)'
            }}
          >
            <Plus size={18} />
            <span>Add Client</span>
          </button>
        </div>

      </div>
    </div>
  );
}
