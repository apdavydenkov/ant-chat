import type { User, Channel, Message, Permission, Role, PermissionName } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL;


class ApiService {
  private permissionsCache: Record<string, boolean> = {};
  
  setAuthToken(token: string | null) {
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
      this.permissionsCache = {};
    }
  }

  clearAuth() {
    localStorage.removeItem('authToken');
    this.permissionsCache = {};
  }

  private getAuthToken(): string | null {
    const token = localStorage.getItem('authToken');
    console.log('[API] Reading token from localStorage:', token ? token.substring(0, 20) + '...' : 'NULL');
    return token;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string> || {}),
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers,
      ...options,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Unauthorized - clear auth completely
        this.clearAuth();
        // НЕ перезагружаем страницу - пусть приложение само обработает отсутствие токена
        throw new Error('Session expired. Please login again.');
      }
      const error = await response.json().catch(() => ({ error: 'API request failed' }));
      throw new Error(error.error || 'API request failed');
    }

    return response.json();
  }

  // Auth
  async telegramLogin(telegramData: any): Promise<{ user: User; token: string }> {
    return this.request('/auth/telegram-login', {
      method: 'POST',
      body: JSON.stringify(telegramData),
    });
  }

  async getCurrentUser(): Promise<{ user: User }> {
    return this.request('/auth/me');
  }

  async getUser(id: string): Promise<{ user: User }> {
    // ВСЕГДА запрашиваем с сервера - никакого кэширования
    return this.request(`/auth/user/${id}`);
  }

  async getPublicUser(id: string): Promise<{ user: { id: string; role: string; firstName?: string; lastName?: string; avatar?: string } }> {
    return this.request(`/auth/user/${id}/public`);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<{ user: User }> {
    return this.request(`/auth/user/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Channels
  async getChannels(): Promise<{ channels: Channel[] }> {
    return this.request('/channels');
  }

  async createChannel(name: string, description?: string): Promise<{ channel: Channel }> {
    return this.request('/channels', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async updateChannel(id: string, updates: Partial<Channel>): Promise<{ channel: Channel }> {
    return this.request(`/channels/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteChannel(id: string): Promise<{ success: boolean }> {
    return this.request(`/channels/${id}`, {
      method: 'DELETE',
    });
  }

  // Messages
  async getMessages(): Promise<{ messages: Message[] }> {
    return this.request('/messages');
  }

  async getMessagesByChannel(channelId: string, limit?: number, offset?: number): Promise<{ 
    messages: Message[]; 
    users: Record<string, { id: string; firstName?: string; lastName?: string; avatar?: string }>;
    hasMore: boolean;
    total: number;
  }> {
    const params = new URLSearchParams();
    if (limit !== undefined) params.append('limit', limit.toString());
    if (offset !== undefined) params.append('offset', offset.toString());
    
    const queryString = params.toString();
    const endpoint = `/messages/channel/${channelId}${queryString ? `?${queryString}` : ''}`;
    
    return this.request(endpoint);
  }

  async createMessage(channelId: string, content: string): Promise<{ message: Message }> {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify({ channelId, content }),
    });
  }

  async updateMessage(id: string, updates: Partial<Message>): Promise<{ message: Message }> {
    return this.request(`/messages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteMessage(id: string): Promise<{ success: boolean }> {
    return this.request(`/messages/${id}`, {
      method: 'DELETE',
    });
  }

  // Admin API
  async getAllUsers(): Promise<{ users: User[] }> {
    return this.request('/auth/users');
  }

  async createUser(userData: { username: string; role?: string; bio?: string }): Promise<{ user: User }> {
    return this.request('/auth/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUserRole(userId: string, role: string): Promise<{ user: User }> {
    const response = await this.request(`/auth/user/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
    
    // Очищаем кэш разрешений если это текущий пользователь  
    this.permissionsCache = {};
    
    return response;
  }

  async deleteUser(id: string): Promise<{ success: boolean }> {
    return this.request(`/auth/user/${id}`, {
      method: 'DELETE',
    });
  }

  // Roles API
  async getRoles(): Promise<{ roles: Role[] }> {
    return this.request('/roles');
  }

  async createRole(roleData: { name: string; description?: string; permissions?: string[] }): Promise<{ role: Role }> {
    return this.request('/roles', {
      method: 'POST',
      body: JSON.stringify(roleData),
    });
  }


  async getUserPermissions(userId: string): Promise<{ permissions: Permission[] }> {
    return this.request(`/roles/user/${userId}/permissions`);
  }

  async updateRole(roleId: string, updates: { name?: string; description?: string; permissions?: string[] }): Promise<{ role: Role }> {
    return this.request(`/roles/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteRole(roleId: string): Promise<{ success: boolean }> {
    return this.request(`/roles/${roleId}`, {
      method: 'DELETE',
    });
  }

  async hasPermission(permission: PermissionName, useCache: boolean = true): Promise<boolean> {
    // Проверяем кэш
    if (useCache && permission in this.permissionsCache) {
      return this.permissionsCache[permission];
    }
    
    try {
      const response = await this.request<{ hasPermission: boolean }>(`/permissions/check?permission=${permission}`);
      // Кэшируем результат
      if (useCache) {
        this.permissionsCache[permission] = response.hasPermission;
      }
      return response.hasPermission;
    } catch {
      return false;
    }
  }

  async getUserRole(userId: string): Promise<{ role: Role }> {
    return this.request(`/roles/user/${userId}/role`);
  }

  async getRoleById(roleId: string): Promise<{ role: Role }> {
    return this.request(`/roles/${roleId}`);
  }

  // Permissions API
  async getAllPermissions(): Promise<{ permissions: Permission[] }> {
    return this.request('/permissions');
  }

  async createPermission(permissionData: { name: string; description: string; category: string; isBasic?: boolean }): Promise<{ permission: Permission }> {
    return this.request('/permissions', {
      method: 'POST',
      body: JSON.stringify(permissionData),
    });
  }

  async updatePermission(permissionId: string, updates: { name?: string; description?: string; category?: string; isBasic?: boolean }): Promise<{ permission: Permission }> {
    return this.request(`/permissions/${permissionId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deletePermission(permissionId: string): Promise<{ success: boolean }> {
    return this.request(`/permissions/${permissionId}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();

// For debugging/testing - expose to window
if (typeof window !== 'undefined') {
  (window as any).apiService = apiService;
}