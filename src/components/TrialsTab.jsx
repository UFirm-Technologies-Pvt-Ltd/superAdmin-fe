import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock,
  Plus,
  Search,
  ArrowRightCircle,
  X,
  Building2,
  Hourglass,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ShieldAlert,
  ShieldCheck,
  Check,
  Lock
} from 'lucide-react';
import { api } from '../api/client';

const PAYROLL_MODULE_KEY = 'payroll';

export default function TrialsTab({ showToast }) {
  const [trials, setTrials] = useState([]);
  const [availableModules, setAvailableModules] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [paidSubscriptions, setPaidSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [trialFilter, setTrialFilter] = useState('all'); // 'all' | 'active' | 'expiring' | 'expired'

  // Provision Trial Matrix Modal State
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [isClientLocked, setIsClientLocked] = useState(false);
  const [lockedClient, setLockedClient] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [moduleConfigs, setModuleConfigs] = useState({}); // { [moduleId]: { isChecked, days, validTill, isPaid, isExpired } }
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Convert to Paid Modal State
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertingItem, setConvertingItem] = useState(null); // { propertyId, trialItem, clientName }
  const [convertValidTill, setConvertValidTill] = useState('');

  const calculateExpiryDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + (Number(days) || 14));
    return d.toISOString().split('T')[0];
  };

  const calculateDaysFromDate = (dateStr) => {
    if (!dateStr) return 14;
    const target = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  };

  const buildConfigsForClient = useCallback((client, modulesList, paidList) => {
    const configs = {};
    if (!client || !modulesList) return configs;

    const propertyId = client.propertyId;
    const paidClient = (paidList || []).find((p) => p.propertyId === propertyId);
    const paidModuleIds = new Set((paidClient?.paidModules || []).map((m) => m.moduleId));

    const activeTrials = client.activeTrials || [];
    const expiredTrials = client.expiredTrials || [];

    modulesList.forEach((mod) => {
      const isPaid = paidModuleIds.has(mod.moduleId);
      const activeItem = activeTrials.find((t) => t.moduleId === mod.moduleId);
      const expiredItem = expiredTrials.find((t) => t.moduleId === mod.moduleId);

      if (isPaid) {
        configs[mod.moduleId] = {
          isChecked: false,
          days: 14,
          validTill: '',
          isPaid: true,
          isExpired: false
        };
      } else if (activeItem) {
        const remaining = activeItem.daysRemaining > 0 ? activeItem.daysRemaining : 14;
        const validTillStr = activeItem.validTill
          ? new Date(activeItem.validTill).toISOString().split('T')[0]
          : calculateExpiryDate(remaining);
        configs[mod.moduleId] = {
          isChecked: true,
          days: remaining,
          validTill: validTillStr,
          isPaid: false,
          isExpired: false
        };
      } else if (expiredItem) {
        configs[mod.moduleId] = {
          isChecked: false,
          days: 14,
          validTill: calculateExpiryDate(14),
          isPaid: false,
          isExpired: true
        };
      } else {
        configs[mod.moduleId] = {
          isChecked: false,
          days: 14,
          validTill: calculateExpiryDate(14),
          isPaid: false,
          isExpired: false
        };
      }
    });

    return configs;
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [modulesRes, trialsRes, clientsRes, paidRes] = await Promise.all([
        api.getAvailableModules(),
        api.getTrials({ search }),
        api.getClients({ pageNumber: 1, pageSize: 100 }),
        api.getPaidSubscriptions()
      ]);

      setAvailableModules(Array.isArray(modulesRes) ? modulesRes : (modulesRes?.items || modulesRes?.Items || []));
      setTrials(trialsRes?.items || trialsRes?.Items || (Array.isArray(trialsRes) ? trialsRes : []));
      setAllClients(clientsRes?.items || clientsRes?.Items || (Array.isArray(clientsRes) ? clientsRes : []));
      setPaidSubscriptions(paidRes?.items || paidRes?.Items || (Array.isArray(paidRes) ? paidRes : []));
    } catch (err) {
      showToast(err.message || 'Failed to load trials', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Executive KPI Stats
  const stats = useMemo(() => {
    let totalActiveTrials = 0;
    let totalExpiredTrials = 0;
    let expiringIn7d = 0;

    trials.forEach((t) => {
      const active = t.activeTrials || [];
      const expired = t.expiredTrials || [];
      totalActiveTrials += active.length;
      totalExpiredTrials += expired.length;

      active.forEach((item) => {
        if (item.daysRemaining > 0 && item.daysRemaining <= 7) {
          expiringIn7d++;
        }
      });
    });

    return {
      totalClients: trials.length,
      totalActiveTrials,
      totalExpiredTrials,
      expiringIn7d
    };
  }, [trials]);

  // Filtered Trials
  const filteredTrials = useMemo(() => {
    return trials.filter((t) => {
      const active = t.activeTrials || [];
      const expired = t.expiredTrials || [];

      if (trialFilter === 'active') {
        return active.length > 0;
      }
      if (trialFilter === 'expiring') {
        return active.some((item) => item.daysRemaining > 0 && item.daysRemaining <= 7);
      }
      if (trialFilter === 'expired') {
        return expired.length > 0;
      }
      return true;
    });
  }, [trials, trialFilter]);

  const handleOpenProvision = (client = null) => {
    if (client) {
      // Row-level action: Context is strictly locked to this specific client
      setIsClientLocked(true);
      setLockedClient(client);
      setSelectedPropertyId(client.propertyId.toString());
      setModuleConfigs(buildConfigsForClient(client, availableModules, paidSubscriptions));
    } else {
      // Global header action: Allow selection from Tab 1 clients
      setIsClientLocked(false);
      setLockedClient(null);
      const firstClient = trials[0] || allClients[0];
      const propId = firstClient ? firstClient.propertyId.toString() : '';
      setSelectedPropertyId(propId);
      if (firstClient) {
        setModuleConfigs(buildConfigsForClient(firstClient, availableModules, paidSubscriptions));
      }
    }
    setIsProvisionModalOpen(true);
  };

  const handleClientChange = (newPropertyId) => {
    setSelectedPropertyId(newPropertyId);
    const targetClient = trials.find((t) => String(t.propertyId) === String(newPropertyId))
      || allClients.find((c) => String(c.propertyId) === String(newPropertyId));
    if (targetClient) {
      setModuleConfigs(buildConfigsForClient(targetClient, availableModules, paidSubscriptions));
    }
  };

  const handleToggleModule = (modId) => {
    setModuleConfigs((prev) => {
      const current = prev[modId] || { isChecked: false, days: 14, validTill: calculateExpiryDate(14), isPaid: false };
      if (current.isPaid) return prev; // Cannot toggle active commercial license in trial matrix
      const nextChecked = !current.isChecked;
      return {
        ...prev,
        [modId]: {
          ...current,
          isChecked: nextChecked,
          days: current.days || 14,
          validTill: current.validTill || calculateExpiryDate(14)
        }
      };
    });
  };

  const handleDaysChange = (modId, newDays) => {
    const daysNum = Math.max(1, Math.min(365, parseInt(newDays, 10) || 1));
    const newDate = calculateExpiryDate(daysNum);
    setModuleConfigs((prev) => ({
      ...prev,
      [modId]: {
        ...(prev[modId] || { isChecked: true }),
        days: daysNum,
        validTill: newDate
      }
    }));
  };

  const handleDateChange = (modId, newDate) => {
    const daysDiff = calculateDaysFromDate(newDate);
    setModuleConfigs((prev) => ({
      ...prev,
      [modId]: {
        ...(prev[modId] || { isChecked: true }),
        days: daysDiff,
        validTill: newDate
      }
    }));
  };

  const handleApplyPreset = (modId, presetDays) => {
    const newDate = calculateExpiryDate(presetDays);
    setModuleConfigs((prev) => ({
      ...prev,
      [modId]: {
        ...(prev[modId] || { isChecked: true }),
        isChecked: true,
        days: presetDays,
        validTill: newDate
      }
    }));
  };

  const handleApplyAllDays = (presetDays) => {
    const newDate = calculateExpiryDate(presetDays);
    setModuleConfigs((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((modId) => {
        if (!next[modId].isPaid && next[modId].isChecked) {
          next[modId] = {
            ...next[modId],
            days: presetDays,
            validTill: newDate
          };
        }
      });
      return next;
    });
  };

  const handleSaveProvision = async (e) => {
    e.preventDefault();
    if (!selectedPropertyId) return;

    setIsSubmitting(true);
    try {
      const activePayload = Object.entries(moduleConfigs)
        .filter(([_, config]) => config.isChecked && !config.isPaid)
        .map(([modId, config]) => ({
          moduleId: Number(modId),
          durationDays: Number(config.days) || 14,
          validTill: config.validTill ? new Date(`${config.validTill}T23:59:59.999Z`).toISOString() : null
        }));

      await api.updateTrials(Number(selectedPropertyId), { trials: activePayload });

      showToast('Trial configuration successfully committed!', 'success');
      setIsProvisionModalOpen(false);
      await loadData();
    } catch (err) {
      showToast(err.message || 'Failed to update trial configuration', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeModalClient = useMemo(() => {
    if (isClientLocked && lockedClient) return lockedClient;
    return (
      trials.find((t) => String(t.propertyId) === String(selectedPropertyId)) ||
      allClients.find((c) => String(c.propertyId) === String(selectedPropertyId)) ||
      null
    );
  }, [isClientLocked, lockedClient, trials, allClients, selectedPropertyId]);

  const handleOpenConvert = (client, trialItem) => {
    const clientContractDate =
      client?.contractValidTill ||
      paidSubscriptions.find((p) => p.propertyId === client.propertyId)?.contractValidTill ||
      allClients.find((c) => c.propertyId === client.propertyId)?.validTill;

    const formattedContractDate = clientContractDate
      ? new Date(clientContractDate).toISOString().split('T')[0]
      : '';

    const isPayroll =
      trialItem?.moduleKey?.toLowerCase() === PAYROLL_MODULE_KEY ||
      trialItem?.moduleId === 4 ||
      trialItem?.moduleName?.toLowerCase().includes('payroll');

    const defaultDate = isPayroll
      ? (trialItem.validTill ? new Date(trialItem.validTill).toISOString().split('T')[0] : (formattedContractDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]))
      : (formattedContractDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    setConvertingItem({
      propertyId: client.propertyId,
      clientName: client.clientName,
      trialItem,
      contractValidTill: clientContractDate,
      isPayroll
    });
    setConvertValidTill(defaultDate);
    setIsConvertModalOpen(true);
  };

  const handleSaveConvert = async (e) => {
    e.preventDefault();
    if (!convertingItem) return;

    setIsSubmitting(true);
    try {
      const isPayroll = convertingItem.isPayroll;
      const contractIso = convertingItem.contractValidTill
        ? new Date(convertingItem.contractValidTill).toISOString()
        : null;

      const payload = {
        propertyId: convertingItem.propertyId,
        moduleId: convertingItem.trialItem.moduleId,
        validTill: isPayroll
          ? (convertValidTill ? new Date(`${convertValidTill}T23:59:59.999Z`).toISOString() : contractIso)
          : contractIso
      };

      await api.convertTrialToPaid(payload);

      showToast(`Module converted to permanent paid subscription!`, 'success');
      setIsConvertModalOpen(false);
      setConvertingItem(null);
      await loadData();
    } catch (err) {
      showToast(err.message || 'Failed to convert trial', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── 1. Executive Trial KPI Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '18px'
      }}>
        {/* Card 1: Total Trial Tenants */}
        <div className="card-panel card-panel-hover" style={{ padding: '20px 24px', background: '#FFFFFF', borderColor: 'var(--border-strong)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Trial Organizations
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

        {/* Card 2: Active Demo Modules */}
        <div className="card-panel card-panel-hover" style={{ padding: '20px 24px', background: '#FFFFFF', borderColor: 'var(--border-strong)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Demo Trials
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
              <Hourglass size={20} color="#059669" />
            </div>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: '800', color: '#0F172A', lineHeight: 1 }}>
            {stats.totalActiveTrials}
          </div>
        </div>

        {/* Card 3: Expiring within 7 Days */}
        <div className="card-panel card-panel-hover" style={{ padding: '20px 24px', background: '#FFFFFF', borderColor: 'var(--border-strong)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Expiring Soon (≤7 Days)
            </span>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: stats.expiringIn7d > 0 ? '#FFFBEB' : '#F8FAFC',
              border: `1.5px solid ${stats.expiringIn7d > 0 ? '#FDE68A' : '#E2E8F0'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={20} color={stats.expiringIn7d > 0 ? '#B45309' : '#64748B'} />
            </div>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: '800', color: stats.expiringIn7d > 0 ? '#B45309' : '#0F172A', lineHeight: 1 }}>
            {stats.expiringIn7d}
          </div>
        </div>

        {/* Card 4: Expired / Ready for Conversion */}
        <div className="card-panel card-panel-hover" style={{ padding: '20px 24px', background: '#FFFFFF', borderColor: 'var(--border-strong)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Conversion Pipeline
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
              <ArrowUpRight size={20} color="#4F46E5" />
            </div>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: '800', color: '#0F172A', lineHeight: 1 }}>
            {stats.totalExpiredTrials}
          </div>
        </div>
      </div>

      {/* ── 2. Enterprise Filter & Action Toolbar ── */}
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
              placeholder="Search trial organizations by name or IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '42px', fontSize: '0.9rem' }}
            />
          </div>

          {/* Quick Segment Filter Chips & Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'active', label: `Active (${stats.totalActiveTrials})` },
              { id: 'expiring', label: `Expiring (≤7d)` },
              { id: 'expired', label: `Expired (${stats.totalExpiredTrials})` }
            ].map((f) => {
              const isSelected = trialFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setTrialFilter(f.id)}
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

      {/* ── 3. High-Density Uniform Trials Table ── */}
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
                <th style={{ padding: '16px 20px' }}>Active Trials</th>
                <th style={{ padding: '16px 20px', width: '180px' }}>Expired Trials</th>
                <th style={{ padding: '16px 20px', width: '200px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="4" style={{ padding: '56px 20px', textAlign: 'center', color: '#64748B' }}>
                    <div className="animate-spin" style={{
                      width: '32px',
                      height: '32px',
                      border: '3px solid #E2E8F0',
                      borderTopColor: '#336B93',
                      borderRadius: '50%',
                      margin: '0 auto 12px'
                    }} />
                    <div style={{ fontWeight: '500', fontSize: '0.95rem' }}>Loading trial data...</div>
                  </td>
                </tr>
              ) : filteredTrials.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '56px 20px', textAlign: 'center', color: '#64748B' }}>
                    <div style={{ fontWeight: '700', fontSize: '1.05rem', color: '#0F172A', marginBottom: '4px' }}>No trials found</div>
                    <div style={{ fontSize: '0.9rem' }}>Use "Add/Extend Trial" in any client row to configure demo access.</div>
                  </td>
                </tr>
              ) : (
                filteredTrials.map((client) => {
                  const propertyId = client.propertyId;
                  const clientName = client.clientName;
                  const activeTrials = client.activeTrials || [];
                  const expiredTrials = client.expiredTrials || [];

                  return (
                    <tr
                      key={propertyId}
                      style={{ borderBottom: '1px solid #E2E8F0', transition: 'background-color 0.12s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* Organization & DB */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: '700', fontSize: '1rem', color: '#0F172A', marginBottom: '4px' }}>
                          {clientName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                            #{propertyId}
                          </span>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#475569', fontWeight: '600' }}>
                            {client.dbIp}
                          </span>
                        </div>
                      </td>

                      {/* Active Trials with Clean Compact Badges */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {activeTrials.length === 0 ? (
                            <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: '500' }}>
                              No active trials
                            </span>
                          ) : (
                            activeTrials.map((t) => {
                              const isUrgent = t.daysRemaining <= 7;
                              return (
                                <div
                                  key={t.moduleId}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    backgroundColor: isUrgent ? '#FFFBEB' : '#ECFDF5',
                                    border: `1.5px solid ${isUrgent ? '#FDE68A' : '#A7F3D0'}`,
                                    fontSize: '0.8125rem',
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
                                  }}
                                >
                                  <span style={{ fontWeight: '700', color: isUrgent ? '#92400E' : '#065F46' }}>
                                    {t.moduleName}
                                  </span>
                                  <span style={{
                                    backgroundColor: isUrgent ? '#FEF3C7' : '#D1FAE5',
                                    color: isUrgent ? '#B45309' : '#047857',
                                    fontWeight: '800',
                                    padding: '2px 7px',
                                    borderRadius: '5px',
                                    fontSize: '0.75rem'
                                  }}>
                                    {t.daysRemaining}d left
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenConvert(client, t)}
                                    title={`Convert ${t.moduleName} to permanent commercial license`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      backgroundColor: '#336B93',
                                      color: '#FFFFFF',
                                      border: '1px solid #285577',
                                      borderRadius: '5px',
                                      padding: '3px 8px',
                                      fontSize: '0.725rem',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
                                      transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#285577'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#336B93'}
                                  >
                                    <span>Convert</span>
                                    <ArrowUpRight size={12} />
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </td>

                      {/* Expired Trials */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {expiredTrials.length === 0 ? (
                            <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: '500' }}>—</span>
                          ) : (
                            expiredTrials.map((t) => (
                              <div
                                key={t.moduleId}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  backgroundColor: '#FEF2F2',
                                  border: '1.5px solid #FECACA',
                                  color: '#991B1B',
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  fontSize: '0.8125rem',
                                  fontWeight: '600',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                <span style={{ fontWeight: '700' }}>{t.moduleName}</span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenConvert(client, t)}
                                  title={`Convert expired ${t.moduleName} trial to permanent commercial license`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    backgroundColor: '#DC2626',
                                    color: '#FFFFFF',
                                    border: '1px solid #B91C1C',
                                    borderRadius: '5px',
                                    padding: '3px 8px',
                                    fontSize: '0.725rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B91C1C'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#DC2626'}
                                >
                                  <span>Convert</span>
                                  <ArrowUpRight size={12} />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Row Action */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenProvision(client)}
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
                          <Plus size={16} />
                          <span>Add / Extend Trial</span>
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

      {/* ── 4. Configure Module Trials Modal (Modular Matrix with Editable Days) ── */}
      {isProvisionModalOpen && (
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
            maxWidth: '780px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
            border: '1.5px solid #CBD5E1'
          }}>
            {/* Modal Header */}
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
                  <Clock size={22} color="#FFFFFF" />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#FFFFFF', margin: 0 }}>
                    Configure Module Trials
                  </h3>
                </div>
                <div style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#E0F2FE' }}>
                  Tenant: <strong style={{ color: '#FFFFFF' }}>{activeModalClient?.clientName || 'Selected Organization'}</strong> (#{selectedPropertyId}) • DB: {activeModalClient?.dbIp || 'Dynamic DB'}
                </div>
              </div>
              <button
                onClick={() => setIsProvisionModalOpen(false)}
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

            <form onSubmit={handleSaveProvision} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              {/* Modal Body */}
              <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>

                {/* Organization Selection (Dropdown if opened from top toolbar, locked banner if opened from row) */}
                {!isClientLocked ? (
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: '#F8FAFC',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '150px' }}>
                      <Building2 size={18} color="#336B93" />
                      <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#0F172A' }}>Select Tenant:</span>
                    </div>
                    <select
                      value={selectedPropertyId}
                      onChange={(e) => handleClientChange(e.target.value)}
                      className="form-input"
                      style={{ flex: 1, padding: '7px 12px', fontSize: '0.875rem' }}
                    >
                      {(trials.length > 0 ? trials : allClients).map((c) => (
                        <option key={c.propertyId} value={c.propertyId}>
                          {c.clientName} (#{c.propertyId}) • {c.dbIp}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {/* Trial Expiry Helper & Bulk Duration Presets */}
                <div style={{
                  padding: '10px 14px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem', color: '#334155' }}>
                    <Clock size={16} color="#336B93" />
                    <span>Duration presets</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Set All:</span>
                    {[7, 14, 30, 60].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleApplyAllDays(d)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '5px',
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          color: '#336B93',
                          cursor: 'pointer'
                        }}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>

                {/* Granular Module Trial Matrix Table */}
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
                          <th style={{ padding: '10px 16px' }}>Module & Status</th>
                          <th style={{ padding: '10px 16px', width: '310px' }}>Trial Duration & Expiry</th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableModules.map((mod) => {
                          const config = moduleConfigs[mod.moduleId] || {
                            isChecked: false,
                            days: 14,
                            validTill: calculateExpiryDate(14),
                            isPaid: false,
                            isExpired: false
                          };
                          const isChecked = config.isChecked;
                          const isPaid = config.isPaid;
                          const isExpired = config.isExpired;

                          return (
                            <tr
                              key={mod.moduleId}
                              style={{
                                borderBottom: '1px solid #E2E8F0',
                                backgroundColor: isPaid ? '#F1F5F9' : isChecked ? '#FFFFFF' : '#F8FAFC'
                              }}
                            >
                              {/* Toggle Checkbox */}
                              <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  id={`mod_trial_toggle_${mod.moduleId}`}
                                  checked={isPaid || isChecked}
                                  disabled={isPaid}
                                  onChange={() => handleToggleModule(mod.moduleId)}
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    accentColor: '#336B93',
                                    cursor: isPaid ? 'not-allowed' : 'pointer'
                                  }}
                                />
                              </td>

                              {/* Module Info & Badges */}
                              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                                <label
                                  htmlFor={`mod_trial_toggle_${mod.moduleId}`}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontWeight: '700',
                                    fontSize: '0.92rem',
                                    color: isPaid ? '#475569' : isChecked ? '#0F172A' : '#64748B',
                                    cursor: isPaid ? 'default' : 'pointer'
                                  }}
                                >
                                  {mod.moduleName}
                                  {isPaid && (
                                    <span style={{
                                      fontSize: '0.7rem',
                                      fontWeight: '700',
                                      padding: '2px 8px',
                                      backgroundColor: '#ECFDF5',
                                      color: '#065F46',
                                      borderRadius: '4px',
                                      border: '1px solid #A7F3D0',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}>
                                      <ShieldCheck size={12} />
                                      Commercial Paid
                                    </span>
                                  )}
                                  {!isPaid && isChecked && (
                                    <span style={{
                                      fontSize: '0.7rem',
                                      fontWeight: '700',
                                      padding: '2px 6px',
                                      backgroundColor: '#EFF6FF',
                                      color: '#1D4ED8',
                                      borderRadius: '4px',
                                      border: '1px solid #BFDBFE'
                                    }}>
                                      Trial Active
                                    </span>
                                  )}
                                  {!isPaid && !isChecked && isExpired && (
                                    <span style={{
                                      fontSize: '0.7rem',
                                      fontWeight: '600',
                                      padding: '2px 6px',
                                      backgroundColor: '#FEF2F2',
                                      color: '#991B1B',
                                      borderRadius: '4px',
                                      border: '1px solid #FECACA'
                                    }}>
                                      Prior Trial Expired
                                    </span>
                                  )}
                                </label>
                                {mod.description && (
                                  <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>
                                    {mod.description}
                                  </div>
                                )}
                              </td>

                              {/* Editable Trial Duration & Expiry Input */}
                              <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                                {isPaid ? (
                                  <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '5px 10px',
                                    backgroundColor: '#ECFDF5',
                                    border: '1px solid #A7F3D0',
                                    borderRadius: '6px',
                                    fontSize: '0.825rem',
                                    fontWeight: '600',
                                    color: '#065F46'
                                  }}>
                                    <Lock size={12} color="#059669" />
                                    Active Commercial License
                                  </div>
                                ) : isChecked ? (
                                  <div>
                                    {/* Preset Pills */}
                                    <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                                      {[7, 14, 30, 60].map((preset) => {
                                        const isActive = Number(config.days) === preset;
                                        return (
                                          <button
                                            key={preset}
                                            type="button"
                                            onClick={() => handleApplyPreset(mod.moduleId, preset)}
                                            style={{
                                              padding: '2px 8px',
                                              borderRadius: '4px',
                                              border: `1px solid ${isActive ? '#336B93' : '#CBD5E1'}`,
                                              backgroundColor: isActive ? '#EFF6FF' : '#FFFFFF',
                                              color: isActive ? '#1D4ED8' : '#475569',
                                              fontWeight: isActive ? '700' : '500',
                                              fontSize: '0.75rem',
                                              cursor: 'pointer'
                                            }}
                                          >
                                            {preset}d
                                          </button>
                                        );
                                      })}
                                    </div>

                                    {/* Dual Inputs: Days and Expiry Date */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <input
                                          type="number"
                                          min="1"
                                          max="365"
                                          value={config.days || 14}
                                          onChange={(e) => handleDaysChange(mod.moduleId, e.target.value)}
                                          className="form-input"
                                          style={{ width: '64px', padding: '5px 8px', fontSize: '0.85rem', textAlign: 'center' }}
                                        />
                                        <span style={{ fontSize: '0.775rem', color: '#64748B', fontWeight: '600' }}>days</span>
                                      </div>

                                      <input
                                        type="date"
                                        value={config.validTill || ''}
                                        onChange={(e) => handleDateChange(mod.moduleId, e.target.value)}
                                        className="form-input"
                                        style={{ padding: '5px 8px', fontSize: '0.85rem', flex: 1 }}
                                        required={isChecked}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontStyle: 'italic' }}>
                                    No Trial Configured
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
                  {Object.values(moduleConfigs).filter((c) => c.isChecked && !c.isPaid).length} of {availableModules.length} modules configured for trial
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setIsProvisionModalOpen(false)}
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
                    {isSubmitting ? 'Saving Trials...' : 'Save Trial Configuration'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 5. Convert to Paid Modal ── */}
      {isConvertModalOpen && convertingItem && (
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
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
            border: '1.5px solid #CBD5E1'
          }}>
            <div style={{ padding: '24px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <ArrowRightCircle size={28} />
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0F172A', marginBottom: '8px' }}>
                Convert to Commercial License
              </h3>
              <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '20px', lineHeight: 1.5 }}>
                Converting <strong>{convertingItem.trialItem.moduleName}</strong> to a paid subscription for <strong>{convertingItem.clientName}</strong> (#{convertingItem.propertyId})
              </p>

              <form onSubmit={handleSaveConvert}>
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '700', color: '#0F172A' }}>
                      Contract Expiration Date
                    </label>
                    {!convertingItem.isPayroll && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        color: '#475569',
                        backgroundColor: '#F1F5F9',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: '1px solid #CBD5E1'
                      }}>
                        <Lock size={12} color="#64748B" />
                        Contract Base
                      </span>
                    )}
                  </div>

                  {convertingItem.isPayroll ? (
                    <div>
                      <input
                        type="date"
                        value={convertValidTill}
                        onChange={(e) => setConvertValidTill(e.target.value)}
                        className="form-input"
                        required
                      />
                      <div style={{ fontSize: '0.775rem', color: '#2563EB', marginTop: '6px', fontWeight: '600' }}>
                        Custom expiration date for Payroll
                      </div>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="date"
                        value={convertValidTill}
                        readOnly
                        disabled
                        className="form-input"
                        style={{
                          backgroundColor: '#F8FAFC',
                          color: '#475569',
                          borderColor: '#CBD5E1',
                          cursor: 'not-allowed',
                          fontWeight: '600'
                        }}
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setIsConvertModalOpen(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary"
                    style={{ background: '#059669', borderColor: '#047857' }}
                  >
                    {isSubmitting ? 'Converting...' : 'Confirm License'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
