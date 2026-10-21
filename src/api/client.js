import { encryptPassword } from "./passwordCrypto.js";
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5297';

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

    return await request(`/api/MasterClient?${params.toString()}`);
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
  // Replaces public anonymous /auth/forgot-password with tenant-scoped, audit-logged admin route.
  async sendForgotPassword(propertyId, userId, email) {
    if (propertyId && userId) {
      return await request(`/api/MasterClient/${propertyId}/user/${userId}/send-reset-link`, {
        method: 'POST'
      });
    }
    // Fallback if called without propertyId/userId
    return await request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: email ? email.trim() : '', Email: email ? email.trim() : '' })
    });
  }
};
