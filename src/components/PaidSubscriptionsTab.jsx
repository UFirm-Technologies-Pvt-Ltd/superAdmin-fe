import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  Edit3,
  Search,
  X,
  Check,
  Calendar,
  Clock,
  Building2,
  Layers,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  Lock
} from 'lucide-react';
import { api } from '../api/client';

const PAYROLL_MODULE_KEY = 'payroll';

export default function PaidSubscriptionsTab({ showToast }) {
  const [clients, setClients] = useState([]);
  const [availableModules, setAvailableModules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'expiring' | 'full' | 'partial'

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [moduleConfigs, setModuleConfigs] = useState({}); // { [moduleId]: { isChecked: bool, validTill: string } }
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [modulesRes, paidRes] = await Promise.all([
        api.getAvailableModules(),
        api.getPaidSubscriptions({ search })
      ]);

      setAvailableModules(Array.isArray(modulesRes) ? modulesRes : (modulesRes?.items || modulesRes?.Items || []));
      setClients(paidRes?.items || paidRes?.Items || (Array.isArray(paidRes) ? paidRes : []));
    } catch (err) {
      showToast(err.message || 'Failed to load paid subscriptions', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Executive KPI Metrics
  const stats = useMemo(() => {
    const totalClients = clients.length;
    let totalActiveLicenses = 0;
    let expiringSoonCount = 0;
    const now = new Date();

    clients.forEach((c) => {
      const paid = c.paidModules || [];
      totalActiveLicenses += paid.length;
      const contractDate = c.contractValidTill ? new Date(c.contractValidTill) : null;
      if (contractDate) {
        const diffDays = Math.ceil((contractDate - now) / (1000 * 60 * 60 * 24));
        if (diffDays > 0 && diffDays <= 30) {
          expiringSoonCount++;
        }
      }
    });

    const maxPossibleLicenses = totalClients * (availableModules.length || 9);
    const coveragePercent = maxPossibleLicenses > 0 ? Math.round((totalActiveLicenses / maxPossibleLicenses) * 100) : 0;

    return {
      totalClients,
      totalActiveLicenses,
      expiringSoonCount,
      coveragePercent
    };
  }, [clients, availableModules]);

  // Filtered Clients
  const filteredClients = useMemo(() => {
    const now = new Date();
    return clients.filter((c) => {
      const paid = c.paidModules || [];

      if (statusFilter === 'expiring') {
        const contractDate = c.contractValidTill ? new Date(c.contractValidTill) : null;
        if (!contractDate) return false;
        const diff = Math.ceil((contractDate - now) / (1000 * 60 * 60 * 24));
        return diff > 0 && diff <= 30;
      }
      if (statusFilter === 'full') {
        return availableModules.length > 0 && paid.length >= availableModules.length;
      }
      if (statusFilter === 'partial') {
        return paid.length < availableModules.length;
      }
      return true;
    });
  }, [clients, statusFilter, availableModules]);

  const handleOpenEdit = (client) => {
    setSelectedClient(client);

    const contractDateStr = client.contractValidTill
      ? new Date(client.contractValidTill).toISOString().split('T')[0]
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const initialConfigs = {};
    availableModules.forEach((mod) => {
      const isPayroll = mod.moduleKey?.toLowerCase() === PAYROLL_MODULE_KEY;
      const activeItem = (client.paidModules || []).find((p) => p.moduleId === mod.moduleId);
      if (activeItem) {
        initialConfigs[mod.moduleId] = {
          isChecked: true,
          validTill: isPayroll
            ? (activeItem.validTill ? new Date(activeItem.validTill).toISOString().split('T')[0] : contractDateStr)
            : contractDateStr
        };
      } else {
        initialConfigs[mod.moduleId] = {
          isChecked: false,
          validTill: contractDateStr
        };
      }
    });

    setModuleConfigs(initialConfigs);
    setIsEditModalOpen(true);
  };

  const handleToggleModule = (modId) => {
    setModuleConfigs((prev) => {
      const current = prev[modId] || { isChecked: false, validTill: '' };
      return {
        ...prev,
        [modId]: {
          ...current,
          isChecked: !current.isChecked
        }
      };
    });
  };

  const handleDateChange = (modId, newDate) => {
    setModuleConfigs((prev) => ({
      ...prev,
      [modId]: {
        ...(prev[modId] || { isChecked: true }),
        validTill: newDate
      }
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedClient) return;

    setIsSubmitting(true);
    try {
      const contractDateIso = selectedClient.contractValidTill
        ? new Date(selectedClient.contractValidTill).toISOString()
        : null;

      const activePayload = Object.entries(moduleConfigs)
        .filter(([_, config]) => config.isChecked)
        .map(([modId, config]) => {
          const mod = availableModules.find((m) => String(m.moduleId) === String(modId));
          const isPayroll = mod?.moduleKey?.toLowerCase() === PAYROLL_MODULE_KEY;
          return {
            moduleId: Number(modId),
            validTill: isPayroll
              ? (config.validTill ? new Date(`${config.validTill}T23:59:59.999Z`).toISOString() : contractDateIso)
              : contractDateIso
          };
        });

      await api.updatePaidSubscriptions(selectedClient.propertyId, {
        modules: activePayload,
        validTill: contractDateIso
      });

      showToast(`Module entitlements successfully committed for "${selectedClient.clientName}".`, 'success');
      setIsEditModalOpen(false);
      setSelectedClient(null);
      await loadData();
    } catch (err) {
      showToast(err.message || 'Failed to update module licenses', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── 1. Executive Licensing Metric Cards (Tier-1 Enterprise Header) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '18px'
      }}>
        {/* Card 1: Subscribed Organizations */}
        <div className="card-panel card-panel-hover" style={{ padding: '20px 24px', background: '#FFFFFF', borderColor: 'var(--border-strong)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Licensed Organizations
            </span>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#EBF3F8',
              border: '1.5px solid #CCE0EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Building2 size={20} color="#336B93" />
            </div>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: '800', color: '#0F172A', lineHeight: 1 }}>
            {stats.totalClients}
          </div>
        </div>

        {/* Card 2: Active Module Entitlements */}
        <div className="card-panel card-panel-hover" style={{ padding: '20px 24px', background: '#FFFFFF', borderColor: 'var(--border-strong)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Module Licenses
            </span>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#ECFDF5',
              border: '1.5px solid #A7F3D0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldCheck size={20} color="#059669" />
            </div>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: '800', color: '#0F172A', lineHeight: 1 }}>
            {stats.totalActiveLicenses}
          </div>
        </div>

        {/* Card 3: Expiring Soon */}
        <div className="card-panel card-panel-hover" style={{ padding: '20px 24px', background: '#FFFFFF', borderColor: 'var(--border-strong)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Expiring Soon (≤30 Days)
            </span>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: stats.expiringSoonCount > 0 ? '#FFFBEB' : '#F8FAFC',
              border: `1.5px solid ${stats.expiringSoonCount > 0 ? '#FDE68A' : '#E2E8F0'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={20} color={stats.expiringSoonCount > 0 ? '#B45309' : '#64748B'} />
            </div>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: '800', color: stats.expiringSoonCount > 0 ? '#B45309' : '#0F172A', lineHeight: 1 }}>
            {stats.expiringSoonCount}
          </div>
        </div>

        {/* Card 4: Portfolio Licensing Coverage */}
        <div className="card-panel card-panel-hover" style={{ padding: '20px 24px', background: '#FFFFFF', borderColor: 'var(--border-strong)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Portfolio Module Adoption
            </span>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#EEF2FF',
              border: '1.5px solid #C7D2FE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUp size={20} color="#4F46E5" />
            </div>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: '800', color: '#0F172A', lineHeight: 1 }}>
            {stats.coveragePercent}%
          </div>
        </div>
      </div>

      {/* ── 2. Enterprise Filter & Search Command Bar ── */}
      <div className="card-panel" style={{ padding: '16px 20px', background: '#FFFFFF', borderColor: 'var(--border-strong)' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1', minWidth: '280px', maxWidth: '420px' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search by client name, ID, or database host..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '42px', fontSize: '0.9rem' }}
            />
          </div>

          {/* Quick Segment Filter Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'expiring', label: `Expiring Soon (${stats.expiringSoonCount})` },
              { id: 'full', label: 'Fully Licensed' },
              { id: 'partial', label: 'Partial' }
            ].map((f) => {
              const isSelected = statusFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: `1.5px solid ${isSelected ? '#336B93' : '#CBD5E1'}`,
                    backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC',
                    color: isSelected ? '#1E40AF' : '#334155',
                    fontSize: '0.85rem',
                    fontWeight: isSelected ? '700' : '600',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 1px 3px rgba(30, 64, 175, 0.15)' : '0 1px 2px rgba(0, 0, 0, 0.04)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#F1F5F9';
                      e.currentTarget.style.borderColor = '#94A3B8';
                      e.currentTarget.style.color = '#0F172A';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#F8FAFC';
                      e.currentTarget.style.borderColor = '#CBD5E1';
                      e.currentTarget.style.color = '#334155';
                    }
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 3. High-Density Enterprise Entitlements Table ── */}
      <div className="card-panel" style={{ overflow: 'hidden', background: '#FFFFFF', borderColor: 'var(--border-strong)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '980px' }}>
            <thead>
              <tr style={{
                background: '#F8FAFC',
                borderBottom: '2px solid #CBD5E1',
                color: '#1E293B',
                fontSize: '0.8rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}>
                <th style={{ padding: '16px 20px', width: '260px' }}>Organization</th>
                <th style={{ padding: '16px 20px', width: '150px' }}>Contract Expiry</th>
                <th style={{ padding: '16px 20px' }}>Licensed Modules</th>
                <th style={{ padding: '16px 20px', width: '110px', textAlign: 'center' }}>Active</th>
                <th style={{ padding: '16px 20px', width: '200px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" style={{ padding: '56px 20px', textAlign: 'center', color: '#64748B' }}>
                    <div className="animate-spin" style={{
                      width: '32px',
                      height: '32px',
                      border: '3px solid #E2E8F0',
                      borderTopColor: '#336B93',
                      borderRadius: '50%',
                      margin: '0 auto 12px'
                    }} />
                    <div style={{ fontWeight: '500', fontSize: '0.95rem' }}>Loading enterprise subscriptions...</div>
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '56px 20px', textAlign: 'center', color: '#64748B' }}>
                    <div style={{ fontWeight: '700', fontSize: '1.05rem', color: '#0F172A', marginBottom: '4px' }}>No subscriptions found</div>
                    <div style={{ fontSize: '0.9rem' }}>Try clearing filters or add clients in Tab 1 first.</div>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const paid = client.paidModules || [];
                  const totalPossible = availableModules.length || 9;
                  const ratio = totalPossible > 0 ? paid.length / totalPossible : 0;
                  const contractDate = client.contractValidTill ? new Date(client.contractValidTill) : null;
                  const contractDaysLeft = contractDate ? Math.max(0, Math.ceil((contractDate - new Date()) / (1000 * 60 * 60 * 24))) : 0;
                  const isContractExpiring = contractDate && contractDaysLeft > 0 && contractDaysLeft <= 30;

                  return (
                    <tr
                      key={client.propertyId}
                      style={{
                        borderBottom: '1px solid #E2E8F0',
                        transition: 'background-color 0.12s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* Organization & DB Details */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: '700', fontSize: '1rem', color: '#0F172A', marginBottom: '4px' }}>
                          {client.clientName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            backgroundColor: '#EFF6FF',
                            color: '#1D4ED8',
                            border: '1px solid #BFDBFE',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            #{client.propertyId}
                          </span>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748B' }}>
                            {client.dbIp}
                          </span>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: client.isClientActive ? '#059669' : '#64748B'
                          }}>
                            <span style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: client.isClientActive ? '#10B981' : '#94A3B8'
                            }} />
                            {client.isClientActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>

                      {/* Master Contract Date */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: '700', fontSize: '0.92rem', color: '#0F172A' }}>
                          {contractDate ? contractDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Perpetual'}
                        </div>
                        {contractDate && isContractExpiring ? (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.725rem',
                            fontWeight: '700',
                            color: '#92400E',
                            backgroundColor: '#FEF3C7',
                            border: '1px solid #FDE68A',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            marginTop: '4px'
                          }}>
                            <Clock size={12} color="#B45309" />
                            {contractDaysLeft > 0 ? `${contractDaysLeft}d left` : 'Expired'}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '600', marginTop: '4px' }}>
                            Active Contract
                          </div>
                        )}
                      </td>

                      {/* Licensed Modules */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {paid.length === 0 ? (
                            <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontStyle: 'italic' }}>
                              No modules assigned
                            </span>
                          ) : (
                            paid.map((item) => {
                              const isPayroll = item.moduleKey?.toLowerCase() === PAYROLL_MODULE_KEY;
                              const validTillDate = item.validTill ? new Date(item.validTill) : null;
                              const isCustomPayroll = isPayroll && validTillDate && contractDate && Math.abs(validTillDate.getTime() - contractDate.getTime()) > 86400000;
                              const payrollDaysLeft = isPayroll && validTillDate ? Math.ceil((validTillDate - new Date()) / (1000 * 60 * 60 * 24)) : null;

                              return (
                                <span
                                  key={item.moduleId}
                                  title={`${item.moduleName}${validTillDate ? ` • Valid until ${validTillDate.toLocaleDateString('en-GB')}` : ''}`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    backgroundColor: '#ECFDF5',
                                    border: '1px solid #A7F3D0',
                                    color: '#065F46',
                                    fontSize: '0.8125rem',
                                    fontWeight: '600',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  <span>{item.moduleName}</span>
                                  {isCustomPayroll && payrollDaysLeft !== null && (
                                    <span style={{
                                      fontSize: '0.7rem',
                                      fontWeight: '700',
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      backgroundColor: payrollDaysLeft <= 30 ? '#FEF3C7' : '#EFF6FF',
                                      color: payrollDaysLeft <= 30 ? '#92400E' : '#1D4ED8',
                                      border: `1px solid ${payrollDaysLeft <= 30 ? '#FDE68A' : '#BFDBFE'}`
                                    }}>
                                      {payrollDaysLeft <= 30 ? `${payrollDaysLeft}d` : 'Custom'}
                                    </span>
                                  )}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>

                      {/* Adoption Meter */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#0F172A', marginBottom: '4px' }}>
                          {paid.length} / {totalPossible}
                        </div>
                        <div style={{
                          width: '80px',
                          height: '6px',
                          borderRadius: '3px',
                          backgroundColor: '#E2E8F0',
                          overflow: 'hidden',
                          margin: '0 auto'
                        }}>
                          <div style={{
                            width: `${Math.round(ratio * 100)}%`,
                            height: '100%',
                            backgroundColor: ratio === 1 ? '#10B981' : '#336B93',
                            borderRadius: '3px'
                          }} />
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(client)}
                          className="btn-primary"
                          style={{
                            padding: '8px 16px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                            borderRadius: '8px',
                            cursor: 'pointer'
                          }}
                        >
                          <Edit3 size={16} />
                          <span>Manage Licenses</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. Enterprise License Management Drawer / Modal ── */}
      {isEditModalOpen && selectedClient && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '24px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '740px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
            border: '1.5px solid #CBD5E1'
          }}>
            {/* Enterprise Header Banner */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1.5px solid #E2E8F0',
              background: '#336B93',
              color: '#FFFFFF'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={22} color="#FFFFFF" />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#FFFFFF', margin: 0 }}>
                    Configure Module Entitlements
                  </h3>
                </div>
                <div style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#E0F2FE' }}>
                  Tenant: <strong style={{ color: '#FFFFFF' }}>{selectedClient.clientName}</strong> (#{selectedClient.propertyId}) • DB: {selectedClient.dbIp}
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: '#FFFFFF',
                  padding: '6px',
                  display: 'flex'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              {/* Modal Body */}
              <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Master Contract Validity Info Card */}
                <div style={{
                  padding: '10px 14px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: '#1E293B' }}>
                    <ShieldCheck size={18} color="#336B93" />
                    <span>Contract Expiry: <strong>{selectedClient?.contractValidTill
                      ? new Date(selectedClient.contractValidTill).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'None'}</strong></span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    All modules inherit contract expiry except Payroll
                  </span>
                </div>

                {/* Granular Module Entitlements Table */}
                <div>
                  <div style={{
                    border: '1.5px solid #E2E8F0',
                    borderRadius: '10px',
                    overflow: 'hidden'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '0.75rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                          <th style={{ padding: '10px 16px', width: '60px', textAlign: 'center' }}>Enabled</th>
                          <th style={{ padding: '10px 16px' }}>Module</th>
                          <th style={{ padding: '10px 16px', width: '220px' }}>Expiration Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableModules.map((mod) => {
                          const isPayroll = mod.moduleKey?.toLowerCase() === PAYROLL_MODULE_KEY;
                          const config = moduleConfigs[mod.moduleId] || { isChecked: false, validTill: '' };
                          const isChecked = config.isChecked;
                          const validTill = isPayroll
                            ? config.validTill
                            : (selectedClient?.contractValidTill ? new Date(selectedClient.contractValidTill).toISOString().split('T')[0] : '');
                          const daysRemaining = validTill ? Math.ceil((new Date(validTill) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

                          return (
                            <tr
                              key={mod.moduleId}
                              style={{
                                borderBottom: '1px solid #E2E8F0',
                                backgroundColor: isChecked ? '#FFFFFF' : '#F8FAFC'
                              }}
                            >
                              {/* Toggle Checkbox */}
                              <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  id={`mod_toggle_${mod.moduleId}`}
                                  checked={isChecked}
                                  onChange={() => handleToggleModule(mod.moduleId)}
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    accentColor: '#336B93',
                                    cursor: 'pointer'
                                  }}
                                />
                              </td>

                              {/* Module Info */}
                              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                                <label
                                  htmlFor={`mod_toggle_${mod.moduleId}`}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontWeight: '700',
                                    fontSize: '0.92rem',
                                    color: isChecked ? '#0F172A' : '#64748B',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {mod.moduleName}
                                  {isPayroll && (
                                    <span style={{
                                      fontSize: '0.7rem',
                                      fontWeight: '600',
                                      padding: '2px 6px',
                                      backgroundColor: '#EFF6FF',
                                      color: '#2563EB',
                                      borderRadius: '4px',
                                      border: '1px solid #BFDBFE'
                                    }}>
                                      Custom Validity
                                    </span>
                                  )}
                                </label>
                                {mod.description && (
                                  <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>
                                    {mod.description}
                                  </div>
                                )}
                              </td>

                              {/* Expiration Date / Contract Inheritance */}
                              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                                {isChecked ? (
                                  isPayroll ? (
                                    <div>
                                      <input
                                        type="date"
                                        value={validTill || ''}
                                        onChange={(e) => handleDateChange(mod.moduleId, e.target.value)}
                                        required={isChecked}
                                        className="form-input"
                                        style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                                      />
                                      <div style={{
                                        fontSize: '0.725rem',
                                        fontWeight: '700',
                                        color: daysRemaining > 30 ? '#047857' : daysRemaining > 0 ? '#B45309' : '#DC2626',
                                        marginTop: '4px'
                                      }}>
                                        {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Expired'}
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '5px 10px',
                                      backgroundColor: '#F1F5F9',
                                      border: '1px solid #CBD5E1',
                                      borderRadius: '6px',
                                      fontSize: '0.825rem',
                                      fontWeight: '600',
                                      color: '#334155',
                                      width: 'fit-content'
                                    }}>
                                      <Lock size={12} color="#64748B" />
                                      {selectedClient?.contractValidTill
                                        ? new Date(selectedClient.contractValidTill).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                        : 'Contract Base'}
                                    </div>
                                  )
                                ) : (
                                  <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontStyle: 'italic' }}>
                                    Unlicensed
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                borderTop: '1.5px solid #E2E8F0',
                backgroundColor: '#F8FAFC'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#475569', fontWeight: '600' }}>
                  {Object.values(moduleConfigs).filter((c) => c.isChecked).length} of {availableModules.length} core modules active
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary"
                  >
                    <Check size={16} />
                    {isSubmitting ? 'Saving Entitlements...' : 'Save Configuration'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
