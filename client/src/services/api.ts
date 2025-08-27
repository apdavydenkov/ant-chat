import type { User, Channel, Message, Permission, Role, PermissionName } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL;


class ApiService {
  private currentUserId: string | null = null;

  setCurrentUser(userId: string) {
    this.currentUserId = userId;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string> || {}),
    };

    if (this.currentUserId) {
      headers['x-user-id'] = this.currentUserId;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers,
      ...options,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    return response.json();
  }

  // Auth
  async login(username: string): Promise<{ user: User }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  }

  async getUser(id: string): Promise<{ user: User }> {
    return this.request(`/auth/user/${id}`);
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

  async getMessagesByChannel(channelId: string): Promise<{ messages: Message[] }> {
    return this.request(`/messages/channel/${channelId}`);
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
    return this.request(`/auth/user/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
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

  async hasPermission(permission: PermissionName): Promise<boolean> {
    try {
      const response = await this.request<{ hasPermission: boolean }>(`/permissions/check?permission=${permission}`);
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