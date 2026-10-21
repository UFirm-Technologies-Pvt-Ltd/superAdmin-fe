import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import StatsCards from '../components/StatsCards';
import FilterBar from '../components/FilterBar';
import ClientTable from '../components/ClientTable';
import ClientModal from '../components/ClientModal';
import DeleteModal from '../components/DeleteModal';
import StatusModal from '../components/StatusModal';
import Toast from '../components/Toast';
import { api } from '../api/client';

export default function ClientDashboard({ user, onLogout }) {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(null); // null = all, true = active, false = inactive

  // Modal States
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [isModalSubmitting, setIsModalSubmitting] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingClient, setDeletingClient] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusTogglingClient, setStatusTogglingClient] = useState(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getClients({
        search,
        isActive: activeFilter,
        pageNumber: 1,
        pageSize: 100
      });
      // Handle both PagedResult ({ items/Items }) and array
      const rawList = res?.items || res?.Items || (Array.isArray(res) ? res : []);
      const normalized = rawList.map(c => {
        const mu = c.masterUser ?? c.MasterUser;
        return {
          propertyId: c.propertyId ?? c.PropertyId,
          clientName: c.clientName ?? c.ClientName,
          dbIp: c.dbIp ?? c.DbIp,
          dbUserName: c.dbUserName ?? c.DbUserName,
          validTill: c.validTill ?? c.ValidTill,
          isActive: c.isActive ?? c.IsActive,
          isDeleted: c.isDeleted ?? c.IsDeleted,
          authenticationToken: c.authenticationToken ?? c.AuthenticationToken,
          createdOn: c.createdOn ?? c.CreatedOn,
          updatedOn: c.updatedOn ?? c.UpdatedOn,
          activationDate: c.activationDate ?? c.ActivationDate,
          deactivationDate: c.deactivationDate ?? c.DeactivationDate,
          masterUser: mu ? {
            userId: mu.userId ?? mu.UserId,
            email: mu.email ?? mu.Email,
            canAddUsers: Boolean(mu.canAddUsers ?? mu.CanAddUsers),
            isActive: (mu.isActive ?? mu.IsActive) !== false
          } : null
        };
      });
      setClients(normalized);
    } catch (err) {
      showToast(err.message || 'Failed to fetch clients', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [search, activeFilter]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Create or Update Client
  const handleSaveClient = async (formData) => {
    setIsModalSubmitting(true);
    try {
      if (editingClient) {
        await api.updateClient(editingClient.propertyId, formData);
        showToast(`Tenant "${formData.clientName}" updated.`);
      } else {
        const res = await api.createClient(formData);
        const emailSent = res?.emailSent ?? res?.EmailSent;
        const emailStatus = res?.emailStatus ?? res?.EmailStatus;
        if (emailSent) {
          showToast(`Tenant "${formData.clientName}" created! Login credentials emailed to ${formData.email}.`, 'success');
        } else if (emailStatus && emailStatus.startsWith('FAILED')) {
          showToast(`Tenant "${formData.clientName}" created, but credentials email failed: ${emailStatus}`, 'warning');
        } else if (res?.initialUserId || res?.InitialUserId || formData.email) {
          showToast(`Tenant "${formData.clientName}" and user "${formData.email}" created.`, 'success');
        } else {
          showToast(`Tenant "${formData.clientName}" added.`, 'success');
        }
      }
      setIsClientModalOpen(false);
      setEditingClient(null);
      await fetchClients();
    } finally {
      setIsModalSubmitting(false);
    }
  };

  // Open Status Confirmation Modal
  const handleOpenStatusModal = (client) => {
    setStatusTogglingClient(client);
    setIsStatusModalOpen(true);
  };

  // Confirmed Toggle Status
  const handleConfirmToggleStatus = async () => {
    if (!statusTogglingClient) return;
    const newStatus = !statusTogglingClient.isActive;
    setIsTogglingStatus(true);
    try {
      await api.updateClient(statusTogglingClient.propertyId, {
        clientName: statusTogglingClient.clientName,
        dbIp: statusTogglingClient.dbIp,
        dbUserName: statusTogglingClient.dbUserName,
        validTill: statusTogglingClient.validTill,
        isActive: newStatus,
        authenticationToken: statusTogglingClient.authenticationToken
      });
      showToast(`Tenant "${statusTogglingClient.clientName}" is now ${newStatus ? 'Active' : 'Inactive'}`);
      setIsStatusModalOpen(false);
      setStatusTogglingClient(null);
      await fetchClients();
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Soft Delete Client
  const handleConfirmDelete = async () => {
    if (!deletingClient) return;
    setIsDeleting(true);
    try {
      await api.deleteClient(deletingClient.propertyId);
      showToast(`Tenant "${deletingClient.clientName}" deactivated.`);
      setIsDeleteModalOpen(false);
      setDeletingClient(null);
      await fetchClients();
    } catch (err) {
      showToast(err.message || 'Failed to deactivate client', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '48px' }}>
      <Navbar user={user} onLogout={onLogout} />

      <main style={{ maxWidth: '1360px', margin: '0 auto', padding: '0 24px' }}>
        
        {/* Page Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.9rem', fontWeight: '800', color: '#0F172A', marginBottom: '8px', letterSpacing: '-0.02em' }}>
            Client Management
          </h1>
          <p style={{ color: '#475569', fontSize: '1.05rem', fontWeight: '500' }}>
            Manage client databases, host configurations, and access status.
          </p>
        </div>

        {/* Stats Cards */}
        <StatsCards clients={clients} />

        {/* Filters & Actions */}
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onRefresh={fetchClients}
          onOpenCreateModal={() => {
            setEditingClient(null);
            setIsClientModalOpen(true);
          }}
          isLoading={isLoading}
        />

        {/* Clients Table */}
        <ClientTable
          clients={clients}
          isLoading={isLoading}
          onEdit={(client) => {
            setEditingClient(client);
            setIsClientModalOpen(true);
          }}
          onDelete={(client) => {
            setDeletingClient(client);
            setIsDeleteModalOpen(true);
          }}
          onToggleStatus={handleOpenStatusModal}
        />

      </main>

      {/* Modals & Toasts */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => {
          setIsClientModalOpen(false);
          setEditingClient(null);
        }}
        onSubmit={handleSaveClient}
        initialData={editingClient}
        isLoading={isModalSubmitting}
      />

      <StatusModal
        isOpen={isStatusModalOpen}
        onClose={() => {
          setIsStatusModalOpen(false);
          setStatusTogglingClient(null);
        }}
        onConfirm={handleConfirmToggleStatus}
        client={statusTogglingClient}
        isLoading={isTogglingStatus}
      />

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingClient(null);
        }}
        onConfirm={handleConfirmDelete}
        client={deletingClient}
        isLoading={isDeleting}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
