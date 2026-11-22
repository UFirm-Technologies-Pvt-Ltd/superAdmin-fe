import { encryptPassword } from "./passwordCrypto.js";
const rawApiBase = import.meta.env.VITE_API_BASE;
if (!rawApiBase) {
  throw new Error("[CONFIG_ERROR] VITE_API_BASE is required in environment. No fallback allowed.");
}
export const API_BASE = rawApiBase.replace(/\/+$/, '');

export const TOKEN_KEY = 'firmity_superadmin_token';
export const USER_KEY = 'firmity_superadmin_user';

// SEC-FIX-002: In-memory primary token cache with strictly tab-scoped sessionStorage fallback.
// Completely eliminates persistent localStorage storage of SuperAdmin JWT tokens to prevent
// persistent XSS token theft (OWASP ASVS 3.8.3).
let _inMemoryToken = null;
let _inMemoryUser = null;

export function getToken() {
  if (_inMemoryToken) return _inMemoryToken;
  try {
    const sessionToken = sessionStorage.getItem(TOKEN_KEY);
    if (sessionToken) {
      _inMemoryToken = sessionToken;
      return sessionToken;
    }
    // Backward-compatibility / one-time migration: if an old token existed in localStorage,
    // migrate it into tab-scoped sessionStorage and immediately purge it from localStorage.
    const legacyToken = localStorage.getItem(TOKEN_KEY);
    if (legacyToken) {
      sessionStorage.setItem(TOKEN_KEY, legacyToken);
      localStorage.removeItem(TOKEN_KEY);
      _inMemoryToken = legacyToken;
      return legacyToken;
    }
  } catch {}
  return null;
}

export function setSession(token, user) {
  _inMemoryToken = token;
  _inMemoryUser = user;
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    // Hardening: never leave sensitive administrative tokens in persistent localStorage
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
}

export function clearSession() {
  _inMemoryToken = null;
  _inMemoryUser = null;
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
}

export function getCurrentUser() {
  if (_inMemoryUser) return _inMemoryUser;
  try {
    const sessionUser = sessionStorage.getItem(USER_KEY);
    if (sessionUser) {
      _inMemoryUser = JSON.parse(sessionUser);
      return _inMemoryUser;
    }
    const legacyUser = localStorage.getItem(USER_KEY);
    if (legacyUser) {
      sessionStorage.setItem(USER_KEY, legacyUser);
      localStorage.removeItem(USER_KEY);
      _inMemoryUser = JSON.parse(legacyUser);
      return _inMemoryUser;
    }
  } catch {}
  return null;
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token && !endpoint.includes('/login')) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  let data;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('json')) {
    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }
  } else {
    data = await response.text();
  }

  const getErrorMessage = (resData, fallback) => {
    let obj = resData;
    if (typeof resData === 'string') {
      try {
        obj = JSON.parse(resData);
      } catch {
        return resData || fallback;
      }
    }
    if (typeof obj === 'object' && obj !== null) {
      return obj.message || obj.title || obj.detail || obj.error || fallback;
    }
    return fallback;
  };

  if (response.status === 401) {
    if (!endpoint.includes('/login')) {
      clearSession();
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    const message = getErrorMessage(data, 'Session expired or unauthorized. Please log in again.');
    const error = new Error(message);
    error.status = 401;
    error.data = data;
    throw error;
  }

  if (!response.ok) {
    const message = getErrorMessage(data, `Request failed with status ${response.status}`);
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// ── Super Admin APIs ──────────────────────────────────────────────────

export const api = {
  // Authentication
  async login(email, password) {
    const securePassword = await encryptPassword(password, API_BASE);

    const data = await request('/auth/superadmin/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: securePassword,
        deviceType: 'web'
      })
    });
    setSession(data.accessToken, data.user);
    return data;
  },

  logout() {
    clearSession();
  },

  // Client Management (ClientMaster CRUD)
  async getClients({ search = '', isActive = null, pageNumber = 1, pageSize = 50 } = {}) {
    const params = new URLSearchParams();
    if (search) params.append('Search', search);
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      params.append('IsActive', isActive.toString());
    }
    params.append('PageNumber', pageNumber.toString());
    params.append('PageSize', pageSize.toString());

    const res = await request(`/api/MasterClient?${params.toString()}`);
    const rawList = res?.items || res?.Items || (Array.isArray(res) ? res : []);
    const items = rawList.map(c => {
      const masterUser = c.masterUser || c.MasterUser;
      return {
        propertyId: c.propertyId ?? c.PropertyId,
        clientName: c.clientName ?? c.ClientName,
        dbIp: c.dbIp ?? c.DbIp,
        dbUserName: c.dbUserName ?? c.DbUserName,
        validTill: c.validTill ?? c.ValidTill,
        isActive: (c.isActive ?? c.IsActive) !== false,
        isDeleted: Boolean(c.isDeleted ?? c.IsDeleted),
        authenticationToken: c.authenticationToken ?? c.AuthenticationToken,
        createdOn: c.createdOn ?? c.CreatedOn,
        updatedOn: c.updatedOn ?? c.UpdatedOn,
        activationDate: c.activationDate ?? c.ActivationDate,
        deactivationDate: c.deactivationDate ?? c.DeactivationDate,
        masterUser: masterUser ? {
          userId: masterUser.userId ?? masterUser.UserId,
          email: masterUser.email ?? masterUser.Email,
          canAddUsers: Boolean(masterUser.canAddUsers ?? masterUser.CanAddUsers),
          isActive: (masterUser.isActive ?? masterUser.IsActive) !== false
        } : null
      };
    });

    return {
      items,
      totalCount: res?.totalCount ?? res?.TotalCount ?? items.length,
      pageNumber: res?.pageNumber ?? res?.PageNumber ?? pageNumber,
      pageSize: res?.pageSize ?? res?.PageSize ?? pageSize,
      totalPages: res?.totalPages ?? res?.TotalPages ?? 1
    };
  },

  async getClientById(id) {
    return await request(`/api/MasterClient/${id}`);
  },

  async createClient(clientData) {
    return await request('/api/MasterClient', {
      method: 'POST',
      body: JSON.stringify(clientData)
    });
  },

  async updateClient(id, clientData) {
    return await request(`/api/MasterClient/${id}`, {
      method: 'PUT',
      body: JSON.stringify(clientData)
    });
  },

  async deleteClient(id) {
    return await request(`/api/MasterClient/${id}`, {
      method: 'DELETE'
    });
  },

  async createMasterUser(propertyId, userData) {
    return await request(`/api/MasterClient/${propertyId}/users`, {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  async getMasterUser(propertyId) {
    const data = await request(`/api/MasterClient/${propertyId}/user`);
    if (!data) return null;
    return {
      userId: data.userId ?? data.UserId,
      email: data.email ?? data.Email,
      canAddUsers: Boolean(data.canAddUsers ?? data.CanAddUsers),
      isActive: (data.isActive ?? data.IsActive) !== false,
      createdOn: data.createdOn ?? data.CreatedOn,
      updatedOn: data.updatedOn ?? data.UpdatedOn
    };
  },

  async updateMasterUser(propertyId, userId, userData) {
    return await request(`/api/MasterClient/${propertyId}/user/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  },

  async deleteMasterUser(propertyId, userId) {
    return await request(`/api/MasterClient/${propertyId}/user/${userId}`, {
      method: 'DELETE'
    });
  },

  // SEC-FIX-001: Authenticated administrative password reset dispatch.
  // Directly targets the tenant-scoped admin route. No anonymous fallback allowed.
  async sendForgotPassword(propertyId, userId) {
    if (!propertyId || !userId) {
      throw new Error("PropertyId and UserId are required to dispatch password reset link.");
    }
    return await request(`/api/MasterClient/${propertyId}/user/${userId}/send-reset-link`, {
      method: 'POST'
    });
  },

  // Multi-Tenant Modular Subscriptions & Trials (Tabs 2 & 3)
  async getAvailableModules() {
    return await request('/api/ClientSubscription/modules');
  },

  async getPaidSubscriptions({ search = '', isActiveOnly = null, pageNumber = 1, pageSize = 100 } = {}) {
    const params = new URLSearchParams();
    if (search) params.append('Search', search);
    if (isActiveOnly !== null && isActiveOnly !== undefined) params.append('IsActiveOnly', isActiveOnly.toString());
    params.append('PageNumber', pageNumber.toString());
    params.append('PageSize', pageSize.toString());
    return await request(`/api/ClientSubscription/paid?${params.toString()}`);
  },

  async getClientPaidDetail(propertyId) {
    return await request(`/api/ClientSubscription/paid/${propertyId}`);
  },

  async updatePaidSubscriptions(propertyId, data) {
    return await request(`/api/ClientSubscription/paid/${propertyId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async getTrials({ search = '', isActiveOnly = null, pageNumber = 1, pageSize = 100 } = {}) {
    const params = new URLSearchParams();
    if (search) params.append('Search', search);
    if (isActiveOnly !== null && isActiveOnly !== undefined) params.append('IsActiveOnly', isActiveOnly.toString());
    params.append('PageNumber', pageNumber.toString());
    params.append('PageSize', pageSize.toString());
    return await request(`/api/ClientSubscription/trials?${params.toString()}`);
  },

  async provisionTrial(data) {
    return await request('/api/ClientSubscription/trials/provision', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateTrials(propertyId, data) {
    return await request(`/api/ClientSubscription/trials/${propertyId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async convertTrialToPaid(data) {
    return await request('/api/ClientSubscription/trials/convert-to-paid', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};
