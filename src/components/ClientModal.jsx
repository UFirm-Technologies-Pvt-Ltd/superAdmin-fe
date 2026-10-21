import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, ShieldCheck, Lock, Trash2, UserPlus, AlertCircle, Check, Mail, Send, KeyRound, Loader2 } from 'lucide-react';
import { api } from '../api/client';

function formatToInputDate(val) {
  if (!val) return '';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }
    const ymdMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const month = ymdMatch[2].padStart(2, '0');
      const day = ymdMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch {}
  return '';
}

export default function ClientModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isLoading = false
}) {
  const isEdit = !!initialData;

  const [formData, setFormData] = useState({
    clientName: '',
    dbIp: '',
    dbUserName: '',
    dbPassword: '',
    validTill: '',
    isActive: true,
    authenticationToken: ''
  });

  const [addUserData, setAddUserData] = useState({
    email: '',
    password: '',
    canAddUsers: true,
    userIsActive: true
  });

  const [existingUser, setExistingUser] = useState(null);
  const [isUserLoading, setIsUserLoading] = useState(false);
  const [editUserFields, setEditUserFields] = useState({
    password: '',
    canAddUsers: true,
    userIsActive: true
  });

  const [isAddingNewUser, setIsAddingNewUser] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: '',
    password: '',
    canAddUsers: true,
    userIsActive: true
  });

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [userActionNotice, setUserActionNotice] = useState('');

  // Reset Password State (Edit Client mode)
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);
  const [resetFeedback, setResetFeedback] = useState(null);

  const [showDbPassword, setShowDbPassword] = useState(false);
  const [showAddUserPassword, setShowAddUserPassword] = useState(false);
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);

  const [error, setError] = useState('');

  // 60-second cooldown timer for password reset requests
  useEffect(() => {
    let timer;
    if (resetCooldown > 0) {
      timer = setInterval(() => {
        setResetCooldown(prev => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resetCooldown]);

  useEffect(() => {
    if (!isOpen) {
      setError('');
      setIsConfirmingDelete(false);
      setIsConfirmingReset(false);
      setResetFeedback(null);
      setUserActionNotice('');
      return;
    }

    if (initialData) {
      const formattedDate = formatToInputDate(initialData.validTill);

      setFormData({
        clientName: initialData.clientName || '',
        dbIp: initialData.dbIp || '',
        dbUserName: initialData.dbUserName || '',
        dbPassword: '',
        validTill: formattedDate || '',
        isActive: initialData.isActive !== false,
        authenticationToken: initialData.authenticationToken || ''
      });

      setIsAddingNewUser(false);
      setNewUserData({
        email: '',
        password: '',
        canAddUsers: true,
        userIsActive: true
      });
      setIsConfirmingDelete(false);
      setIsConfirmingReset(false);
      setResetFeedback(null);
      setUserActionNotice('');

      const rawUser = initialData.masterUser ?? initialData.MasterUser;
      if (rawUser) {
        const parsed = {
          userId: rawUser.userId ?? rawUser.UserId,
          email: rawUser.email ?? rawUser.Email ?? '',
          canAddUsers: Boolean(rawUser.canAddUsers ?? rawUser.CanAddUsers),
          isActive: (rawUser.isActive ?? rawUser.IsActive) !== false
        };
        setExistingUser(parsed);
        setEditUserFields({
          password: '',
          canAddUsers: parsed.canAddUsers,
          userIsActive: parsed.isActive
        });
      } else {
        setExistingUser(null);
      }

      if (initialData.propertyId) {
        setIsUserLoading(true);
        api.getMasterUser(initialData.propertyId)
          .then((u) => {
            if (u) {
              const parsed = {
                userId: u.userId ?? u.UserId,
                email: u.email ?? u.Email ?? '',
                canAddUsers: Boolean(u.canAddUsers ?? u.CanAddUsers),
                isActive: (u.isActive ?? u.IsActive) !== false
              };
              setExistingUser(parsed);
              setEditUserFields({
                password: '',
                canAddUsers: parsed.canAddUsers,
                userIsActive: parsed.isActive
              });
            } else {
              setExistingUser(null);
            }
          })
          .catch(() => {
            setExistingUser(null);
          })
          .finally(() => {
            setIsUserLoading(false);
          });
      }
    } else {
      setFormData({
        clientName: '',
        dbIp: '',
        dbUserName: '',
        dbPassword: '',
        validTill: '',
        isActive: true,
        authenticationToken: ''
      });
      setAddUserData({
        email: '',
        password: '',
        canAddUsers: true,
        userIsActive: true
      });
      setExistingUser(null);
      setIsAddingNewUser(false);
      setIsConfirmingDelete(false);
      setIsConfirmingReset(false);
      setResetFeedback(null);
      setUserActionNotice('');
    }

    setError('');
    setShowDbPassword(false);
    setShowAddUserPassword(false);
    setShowNewUserPassword(false);
  }, [initialData, isOpen]);

  function generateToken(prefix = 'client') {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return `${prefix}_${randomHex}`;
  }

  function handleAutoGenerateToken() {
    const cleanName = (formData.clientName || 'client').toLowerCase().replace(/[^a-z0-9]/g, '_');
    setFormData(prev => ({
      ...prev,
      authenticationToken: generateToken(cleanName)
    }));
  }

  const handleDeleteMasterUser = async () => {
    const targetUserId = existingUser?.userId ?? existingUser?.UserId;
    if (!initialData?.propertyId || !targetUserId) return;

    setIsDeletingUser(true);
    setError('');
    try {
      await api.deleteMasterUser(initialData.propertyId, targetUserId);
      setExistingUser(null);
      setIsConfirmingDelete(false);
      setUserActionNotice('Master user deleted.');
    } catch (err) {
      setError(err.message || 'Failed to delete user.');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleSendResetPasswordLink = async () => {
    const targetEmail = existingUser?.email || existingUser?.Email;
    const targetUserId = existingUser?.userId ?? existingUser?.UserId;
    const propertyId = initialData?.propertyId;
    if (!targetEmail) {
      setError('No registered email found for this master user.');
      setIsConfirmingReset(false);
      return;
    }

    setIsResettingPassword(true);
    setResetFeedback(null);
    setError('');

    try {
      const res = await api.sendForgotPassword(propertyId, targetUserId, targetEmail);
      setIsConfirmingReset(false);
      const msg = res?.message || `Password reset link sent to ${targetEmail}`;
      setResetFeedback({
        type: 'success',
        message: msg
      });
      setUserActionNotice(`Password reset link sent to ${targetEmail}`);
      setResetCooldown(60);
    } catch (err) {
      setResetFeedback({
        type: 'error',
        message: err.message || 'Failed to send password reset email. Please try again.'
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.clientName.trim()) {
      setError('Client Name is required.');
      return;
    }
    if (!formData.dbIp.trim()) {
      setError('Database Host is required.');
      return;
    }
    if (!formData.dbUserName.trim()) {
      setError('Username is required.');
      return;
    }
    if (!isEdit && !formData.dbPassword.trim()) {
      setError('Password is required.');
      return;
    }
    if (!formData.validTill) {
      setError('Valid Until date is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!isEdit) {
      if (!addUserData.email.trim()) {
        setError('Email is required.');
        return;
      }
      if (!emailRegex.test(addUserData.email.trim())) {
        setError('Valid email address is required.');
        return;
      }
      if (!addUserData.password.trim()) {
        setError('Password is required.');
        return;
      }
      if (addUserData.password.trim().length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
    }

    if (isEdit) {
      if (isAddingNewUser) {
        if (!newUserData.email.trim()) {
          setError('Email is required.');
          return;
        }
        if (!emailRegex.test(newUserData.email.trim())) {
          setError('Valid email address is required.');
          return;
        }
        if (!newUserData.password.trim()) {
          setError('Password is required.');
          return;
        }
        if (newUserData.password.trim().length < 6) {
          setError('Password must be at least 6 characters.');
          return;
        }
      }
    }

    try {
      let validTillIso = '';
      try {
        const d = new Date(formData.validTill);
        if (!isNaN(d.getTime())) {
          validTillIso = d.toISOString();
        } else {
          validTillIso = formData.validTill;
        }
      } catch {
        validTillIso = formData.validTill;
      }

      const payload = {
        clientName: formData.clientName.trim(),
        dbIp: formData.dbIp.trim(),
        dbUserName: formData.dbUserName.trim(),
        validTill: validTillIso,
        isActive: formData.isActive,
        authenticationToken: formData.authenticationToken.trim() || generateToken((formData.clientName || 'client').toLowerCase().replace(/[^a-z0-9]/g, '_'))
      };

      if (formData.dbPassword.trim()) {
        payload.dbPassword = formData.dbPassword.trim();
      }

      if (!isEdit) {
        payload.email = addUserData.email.trim();
        payload.password = addUserData.password.trim();
        payload.canAddUsers = Boolean(addUserData.canAddUsers);
        payload.userIsActive = Boolean(addUserData.userIsActive);
      } else {
        // Edit mode payload: pass exact DTO properties
        const mUserId = existingUser?.userId ?? existingUser?.UserId;
        if (mUserId) {
          payload.masterUserId = mUserId;
          payload.MasterUserId = mUserId;
          payload.canAddUsers = Boolean(editUserFields.canAddUsers);
          payload.CanAddUsers = Boolean(editUserFields.canAddUsers);
          payload.userIsActive = Boolean(editUserFields.userIsActive);
          payload.UserIsActive = Boolean(editUserFields.userIsActive);
        }

        if (isAddingNewUser) {
          payload.newUserEmail = newUserData.email.trim();
          payload.NewUserEmail = newUserData.email.trim();
          payload.newUserPassword = newUserData.password.trim();
          payload.NewUserPassword = newUserData.password.trim();
          payload.newUserCanAddUsers = Boolean(newUserData.canAddUsers);
          payload.NewUserCanAddUsers = Boolean(newUserData.canAddUsers);
          payload.newUserIsActive = Boolean(newUserData.userIsActive);
          payload.NewUserIsActive = Boolean(newUserData.userIsActive);
        }
      }

      await onSubmit(payload);
    } catch (err) {
      setError(err.message || 'Operation failed.');
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999,
      padding: '20px'
    }}>
      <div className="card-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '520px',
        maxHeight: '90vh',
        overflowY: 'auto',
        background: '#FFFFFF',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
      }}>
        
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          background: '#FFFFFF',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
              {isEdit ? 'Edit Client' : 'Add Client'}
            </h3>
            {isEdit && initialData?.propertyId && (
              <span style={{
                fontSize: '0.75rem',
                color: '#475569',
                background: '#F1F5F9',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: '600'
              }}>
                #{initialData.propertyId}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {error && (
            <div style={{
              padding: '10px 14px',
              background: '#FEF2F2',
              border: '1px solid #FEE2E2',
              borderRadius: 'var(--radius-md)',
              color: '#DC2626',
              fontSize: '0.875rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          {userActionNotice && (
            <div style={{
              padding: '10px 14px',
              background: '#F0FDF4',
              border: '1px solid #DCFCE7',
              borderRadius: 'var(--radius-md)',
              color: '#15803D',
              fontSize: '0.85rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Check size={15} />
              <div>{userActionNotice}</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Client Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                Client Name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Client Name"
                className="form-input"
                value={formData.clientName}
                onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                required
              />
            </div>

            {/* DB Host & Username */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Database Host <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 103.67.238.64"
                  className="form-input"
                  value={formData.dbIp}
                  onChange={e => setFormData({ ...formData, dbIp: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  DB Username <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. sa"
                  className="form-input"
                  value={formData.dbUserName}
                  onChange={e => setFormData({ ...formData, dbUserName: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* DB Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                DB Password {isEdit ? <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>(leave blank to keep current)</span> : <span style={{ color: '#EF4444' }}>*</span>}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showDbPassword ? 'text' : 'password'}
                  placeholder={isEdit ? '••••••••' : 'Password'}
                  className="form-input"
                  value={formData.dbPassword}
                  onChange={e => setFormData({ ...formData, dbPassword: e.target.value })}
                  style={{ paddingRight: '38px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowDbPassword(!showDbPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  {showDbPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Valid Until */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                Valid Until <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="date"
                className="form-input"
                value={formData.validTill}
                onChange={e => setFormData({ ...formData, validTill: e.target.value })}
                required
              />
            </div>

            {/* Authentication Token */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  Authentication Token
                </label>
                <button
                  type="button"
                  onClick={handleAutoGenerateToken}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--btn-primary-bg)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    fontWeight: '700'
                  }}
                >
                  Generate
                </button>
              </div>
              <input
                type="text"
                placeholder="Authentication Token"
                className="form-input"
                value={formData.authenticationToken}
                onChange={e => setFormData({ ...formData, authenticationToken: e.target.value })}
              />
            </div>

            {/* Client Status */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: '#F8FAFC',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}>
              <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                Client Active
              </span>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                style={{
                  width: '38px',
                  height: '20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: formData.isActive ? '#10B981' : '#CBD5E1',
                  cursor: 'pointer',
                  position: 'relative',
                  padding: '2px',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  transform: formData.isActive ? 'translateX(18px)' : 'translateX(0)',
                  transition: 'transform 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.15)'
                }} />
              </button>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* MASTER AUTH USER - ADD CLIENT MODE                                  */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {!isEdit && (
              <div style={{
                marginTop: '4px',
                padding: '16px',
                background: '#F8FAFC',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} style={{ color: '#2563EB' }} />
                    <h4 style={{ fontSize: '0.925rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                      Master Auth User
                    </h4>
                  </div>
                  <span style={{ fontSize: '0.725rem', color: '#1D4ED8', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
                    Credentials will be emailed automatically
                  </span>
                </div>

                {/* Email */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Email <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="admin@example.com"
                    className="form-input"
                    value={addUserData.email}
                    onChange={e => setAddUserData({ ...addUserData, email: e.target.value })}
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Password <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showAddUserPassword ? 'text' : 'password'}
                      placeholder="Minimum 6 characters"
                      className="form-input"
                      value={addUserData.password}
                      onChange={e => setAddUserData({ ...addUserData, password: e.target.value })}
                      style={{ paddingRight: '38px' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddUserPassword(!showAddUserPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      {showAddUserPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Can Add Users */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '8px',
                  borderTop: '1px solid #E2E8F0'
                }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                    Can Add Users
                  </span>

                  <button
                    type="button"
                    onClick={() => setAddUserData({ ...addUserData, canAddUsers: !addUserData.canAddUsers })}
                    style={{
                      width: '38px',
                      height: '20px',
                      borderRadius: '10px',
                      border: 'none',
                      background: addUserData.canAddUsers ? '#2563EB' : '#CBD5E1',
                      cursor: 'pointer',
                      position: 'relative',
                      padding: '2px',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      transform: addUserData.canAddUsers ? 'translateX(18px)' : 'translateX(0)',
                      transition: 'transform 0.15s ease',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.15)'
                    }} />
                  </button>
                </div>

                {/* User Active */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '8px',
                  borderTop: '1px solid #E2E8F0'
                }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                    Active Status
                  </span>

                  <button
                    type="button"
                    onClick={() => setAddUserData({ ...addUserData, userIsActive: !addUserData.userIsActive })}
                    style={{
                      width: '38px',
                      height: '20px',
                      borderRadius: '10px',
                      border: 'none',
                      background: addUserData.userIsActive ? '#10B981' : '#CBD5E1',
                      cursor: 'pointer',
                      position: 'relative',
                      padding: '2px',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      transform: addUserData.userIsActive ? 'translateX(18px)' : 'translateX(0)',
                      transition: 'transform 0.15s ease',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.15)'
                    }} />
                  </button>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* MASTER AUTH USER - EDIT CLIENT MODE                                 */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {isEdit && (
              <div style={{
                marginTop: '4px',
                padding: '16px',
                background: '#F8FAFC',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} style={{ color: '#2563EB' }} />
                    <h4 style={{ fontSize: '0.925rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                      Master Auth User
                    </h4>
                  </div>

                  {existingUser && !isConfirmingDelete && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        borderRadius: '6px',
                        background: editUserFields.userIsActive ? '#ECFDF5' : '#F1F5F9',
                        color: editUserFields.userIsActive ? '#047857' : '#475569',
                        border: `1.5px solid ${editUserFields.userIsActive ? '#A7F3D0' : '#CBD5E1'}`
                      }}>
                        {editUserFields.userIsActive ? 'Active' : 'Inactive'}
                      </span>

                      <button
                        type="button"
                        onClick={() => setIsConfirmingDelete(true)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 12px',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          color: '#DC2626',
                          background: '#FEF2F2',
                          border: '1.5px solid #FECACA',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(220, 38, 38, 0.08)',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = '#DC2626';
                          e.currentTarget.style.color = '#FFFFFF';
                          e.currentTarget.style.borderColor = '#DC2626';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(220, 38, 38, 0.25)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = '#FEF2F2';
                          e.currentTarget.style.color = '#DC2626';
                          e.currentTarget.style.borderColor = '#FECACA';
                          e.currentTarget.style.boxShadow = '0 1px 2px rgba(220, 38, 38, 0.08)';
                        }}
                        title="Delete master user"
                      >
                        <Trash2 size={14} style={{ strokeWidth: 2.2 }} />
                        <span>Delete User</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Delete Confirmation */}
                {isConfirmingDelete && (
                  <div style={{
                    padding: '12px 14px',
                    background: '#FEF2F2',
                    border: '1.5px solid #F87171',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    boxShadow: '0 2px 4px rgba(220, 38, 38, 0.12)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: '#FEE2E2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#DC2626',
                        flexShrink: 0
                      }}>
                        <Trash2 size={14} style={{ strokeWidth: 2.2 }} />
                      </div>
                      <span style={{ fontSize: '0.85rem', color: '#991B1B', fontWeight: '700' }}>
                        Delete this master user?
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingDelete(false)}
                        disabled={isDeletingUser}
                        style={{
                          padding: '5px 12px',
                          fontSize: '0.8rem',
                          background: '#FFFFFF',
                          border: '1.5px solid #CBD5E1',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          color: '#334155',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                        onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteMasterUser}
                        disabled={isDeletingUser}
                        style={{
                          padding: '5px 14px',
                          fontSize: '0.8rem',
                          background: '#DC2626',
                          color: '#FFFFFF',
                          border: '1.5px solid #DC2626',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '700',
                          boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#B91C1C'}
                        onMouseLeave={e => e.currentTarget.style.background = '#DC2626'}
                      >
                        {isDeletingUser ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )}

                {isUserLoading && (
                  <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                    Loading...
                  </div>
                )}

                {/* Existing User Fields */}
                {!isUserLoading && existingUser && (
                  <>
                    {/* Email - Locked */}
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.825rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        <span>Email</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                          <Lock size={10} /> Locked
                        </span>
                      </label>
                      <input
                        type="email"
                        className="form-input"
                        value={existingUser?.email || existingUser?.Email || ''}
                        readOnly
                        disabled
                        style={{
                          background: '#F1F5F9',
                          color: '#64748B',
                          cursor: 'not-allowed',
                          fontWeight: '500'
                        }}
                      />
                    </div>

                    {/* Send Reset Password Link Section (Replaces manual password field in Edit mode) */}
                    <div style={{
                      padding: '14px',
                      background: '#FFFFFF',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 200px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <KeyRound size={15} style={{ color: '#2563EB', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                              Password Management
                            </span>
                          </div>
                          <p style={{
                            margin: '4px 0 0 0',
                            fontSize: '0.775rem',
                            color: 'var(--text-secondary)',
                            lineHeight: '1.35'
                          }}>
                            Passwords cannot be set manually. Send a secure reset link to the registered email address.
                          </p>
                        </div>

                        {!isConfirmingReset && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsConfirmingReset(true);
                              setResetFeedback(null);
                            }}
                            disabled={isResettingPassword || resetCooldown > 0 || !editUserFields.userIsActive}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '7px 14px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              color: (!editUserFields.userIsActive || resetCooldown > 0) ? '#64748B' : '#FFFFFF',
                              background: (!editUserFields.userIsActive || resetCooldown > 0) ? '#F1F5F9' : '#2563EB',
                              border: `1px solid ${(!editUserFields.userIsActive || resetCooldown > 0) ? '#CBD5E1' : '#2563EB'}`,
                              borderRadius: '6px',
                              cursor: (!editUserFields.userIsActive || resetCooldown > 0) ? 'not-allowed' : 'pointer',
                              boxShadow: (!editUserFields.userIsActive || resetCooldown > 0) ? 'none' : '0 1px 2px rgba(37, 99, 235, 0.2)',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={e => {
                              if (editUserFields.userIsActive && resetCooldown === 0) {
                                e.currentTarget.style.background = '#1D4ED8';
                                e.currentTarget.style.borderColor = '#1D4ED8';
                              }
                            }}
                            onMouseLeave={e => {
                              if (editUserFields.userIsActive && resetCooldown === 0) {
                                e.currentTarget.style.background = '#2563EB';
                                e.currentTarget.style.borderColor = '#2563EB';
                              }
                            }}
                            title={
                              !editUserFields.userIsActive
                                ? 'Master user is currently inactive'
                                : resetCooldown > 0
                                ? `Please wait ${resetCooldown}s before requesting another reset email`
                                : 'Send password reset link'
                            }
                          >
                            <Mail size={14} style={{ strokeWidth: 2 }} />
                            <span>
                              {resetCooldown > 0 ? `Resend in ${resetCooldown}s` : 'Send Reset Password Link'}
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Inactive user helper text if disabled */}
                      {!editUserFields.userIsActive && (
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#B45309',
                          background: '#FFFBEB',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #FDE68A',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <AlertCircle size={13} style={{ flexShrink: 0 }} />
                          <span>Master Auth User is inactive. Activate user to enable password reset.</span>
                        </div>
                      )}

                      {/* Inline Confirmation Box */}
                      {isConfirmingReset && (
                        <div style={{
                          padding: '12px',
                          background: '#EFF6FF',
                          border: '1.5px solid #93C5FD',
                          borderRadius: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              background: '#DBEAFE',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#2563EB',
                              flexShrink: 0
                            }}>
                              <Send size={13} />
                            </div>
                            <span style={{ fontSize: '0.825rem', color: '#1E40AF', fontWeight: '600' }}>
                              Send password reset link to <strong style={{ color: '#1E3A8A' }}>{existingUser?.email || existingUser?.Email}</strong>?
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => setIsConfirmingReset(false)}
                              disabled={isResettingPassword}
                              style={{
                                padding: '5px 12px',
                                fontSize: '0.8rem',
                                background: '#FFFFFF',
                                border: '1.5px solid #CBD5E1',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                color: '#334155'
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleSendResetPasswordLink}
                              disabled={isResettingPassword}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '5px 14px',
                                fontSize: '0.8rem',
                                background: '#2563EB',
                                color: '#FFFFFF',
                                border: '1.5px solid #2563EB',
                                borderRadius: '6px',
                                cursor: isResettingPassword ? 'not-allowed' : 'pointer',
                                fontWeight: '700',
                                boxShadow: '0 1px 2px rgba(37, 99, 235, 0.25)'
                              }}
                            >
                              {isResettingPassword ? (
                                <>
                                  <Loader2 size={13} className="animate-spin" />
                                  <span>Sending...</span>
                                </>
                              ) : (
                                <>
                                  <Mail size={13} />
                                  <span>Confirm & Send Link</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Success / Error Feedback */}
                      {resetFeedback && !isConfirmingReset && (
                        <div style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: resetFeedback.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                          border: `1px solid ${resetFeedback.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
                          color: resetFeedback.type === 'success' ? '#065F46' : '#991B1B'
                        }}>
                          {resetFeedback.type === 'success' ? (
                            <Check size={14} style={{ color: '#059669', flexShrink: 0 }} />
                          ) : (
                            <AlertCircle size={14} style={{ color: '#DC2626', flexShrink: 0 }} />
                          )}
                          <span>{resetFeedback.message}</span>
                        </div>
                      )}
                    </div>

                    {/* Can Add Users */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '8px',
                      borderTop: '1px solid #E2E8F0'
                    }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                        Can Add Users
                      </span>

                      <button
                        type="button"
                        onClick={() => setEditUserFields({ ...editUserFields, canAddUsers: !editUserFields.canAddUsers })}
                        style={{
                          width: '38px',
                          height: '20px',
                          borderRadius: '10px',
                          border: 'none',
                          background: editUserFields.canAddUsers ? '#2563EB' : '#CBD5E1',
                          cursor: 'pointer',
                          position: 'relative',
                          padding: '2px',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: '#FFFFFF',
                          transform: editUserFields.canAddUsers ? 'translateX(18px)' : 'translateX(0)',
                          transition: 'transform 0.15s ease',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.15)'
                        }} />
                      </button>
                    </div>

                    {/* User Active */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '8px',
                      borderTop: '1px solid #E2E8F0'
                    }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                        Active Status
                      </span>

                      <button
                        type="button"
                        onClick={() => setEditUserFields({ ...editUserFields, userIsActive: !editUserFields.userIsActive })}
                        style={{
                          width: '38px',
                          height: '20px',
                          borderRadius: '10px',
                          border: 'none',
                          background: editUserFields.userIsActive ? '#10B981' : '#CBD5E1',
                          cursor: 'pointer',
                          position: 'relative',
                          padding: '2px',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: '#FFFFFF',
                          transform: editUserFields.userIsActive ? 'translateX(18px)' : 'translateX(0)',
                          transition: 'transform 0.15s ease',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.15)'
                        }} />
                      </button>
                    </div>

                    {/* Inactive Trigger Button */}
                    {!editUserFields.userIsActive && !isAddingNewUser && (
                      <div style={{ paddingTop: '4px' }}>
                        <button
                          type="button"
                          onClick={() => setIsAddingNewUser(true)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: '#EFF6FF',
                            color: '#2563EB',
                            border: '1px dashed #93C5FD',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.825rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          <UserPlus size={15} />
                          + Add New Master Auth User
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* No User State */}
                {!isUserLoading && !existingUser && !isAddingNewUser && (
                  <div style={{ textAlign: 'center', padding: '12px 0' }}>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewUser(true)}
                      className="btn-primary"
                      style={{
                        padding: '7px 14px',
                        fontSize: '0.825rem',
                        fontWeight: '700',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <UserPlus size={15} />
                      + Add New Master Auth User
                    </button>
                  </div>
                )}

                {/* Subform: New User */}
                {isAddingNewUser && (
                  <div style={{
                    padding: '14px',
                    background: '#FFFFFF',
                    border: '1px solid #BFDBFE',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1E40AF' }}>
                        New User
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewUser(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          fontSize: '0.775rem',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        Cancel
                      </button>
                    </div>

                    {/* New Email */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                        Email <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="newadmin@example.com"
                        className="form-input"
                        value={newUserData.email}
                        onChange={e => setNewUserData({ ...newUserData, email: e.target.value })}
                        required
                      />
                    </div>

                    {/* New Password */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                        Password <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showNewUserPassword ? 'text' : 'password'}
                          placeholder="Minimum 6 characters"
                          className="form-input"
                          value={newUserData.password}
                          onChange={e => setNewUserData({ ...newUserData, password: e.target.value })}
                          style={{ paddingRight: '38px' }}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                        >
                          {showNewUserPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    {/* New Can Add Users */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '6px',
                      borderTop: '1px solid #E2E8F0'
                    }}>
                      <span style={{ fontSize: '0.825rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                        Can Add Users
                      </span>

                      <button
                        type="button"
                        onClick={() => setNewUserData({ ...newUserData, canAddUsers: !newUserData.canAddUsers })}
                        style={{
                          width: '36px',
                          height: '18px',
                          borderRadius: '9px',
                          border: 'none',
                          background: newUserData.canAddUsers ? '#2563EB' : '#CBD5E1',
                          cursor: 'pointer',
                          position: 'relative',
                          padding: '2px',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        <div style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          background: '#FFFFFF',
                          transform: newUserData.canAddUsers ? 'translateX(18px)' : 'translateX(0)',
                          transition: 'transform 0.15s ease',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.15)'
                        }} />
                      </button>
                    </div>

                    {/* New User Active */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '6px',
                      borderTop: '1px solid #E2E8F0'
                    }}>
                      <span style={{ fontSize: '0.825rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                        Active Status
                      </span>

                      <button
                        type="button"
                        onClick={() => setNewUserData({ ...newUserData, userIsActive: !newUserData.userIsActive })}
                        style={{
                          width: '36px',
                          height: '18px',
                          borderRadius: '9px',
                          border: 'none',
                          background: newUserData.userIsActive ? '#10B981' : '#CBD5E1',
                          cursor: 'pointer',
                          position: 'relative',
                          padding: '2px',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        <div style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          background: '#FFFFFF',
                          transform: newUserData.userIsActive ? 'translateX(18px)' : 'translateX(0)',
                          transition: 'transform 0.15s ease',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.15)'
                        }} />
                      </button>
                    </div>

                  </div>
                )}
              </div>
            )}

          </div>

          {/* Footer Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '20px',
            paddingTop: '14px',
            borderTop: '1px solid var(--border-subtle)'
          }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isLoading || isDeletingUser}
              style={{ padding: '8px 16px', fontSize: '0.9rem', fontWeight: '600' }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading || isDeletingUser}
              style={{ padding: '8px 20px', fontSize: '0.9rem', fontWeight: '700' }}
            >
              {isLoading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Client')}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
