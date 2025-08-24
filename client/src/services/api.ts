import type { User, Channel, Message } from '../types';

const API_BASE = 'http://localhost:3001/api';

export type Permission = 
  | 'pin_messages'
  | 'delete_messages' 
  | 'create_channels'
  | 'delete_channels'
  | 'pin_channels'
  | 'block_users'
  | 'send_messages'
  | 'account_access';

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  createdAt: Date;
}

class ApiService {
  private currentUserId: string | null = null;

  setCurrentUser(userId: string) {
    this.currentUserId = userId;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options?.headers,
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

  async createChannel(name: string, createdBy: string, description?: string): Promise<{ channel: Channel }> {
    return this.request('/channels', {
      method: 'POST',
      body: JSON.stringify({ name, createdBy, description }),
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

  async createMessage(channelId: string, userId: string, username: string, content: string): Promise<{ message: Message }> {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify({ channelId, userId, username, content }),
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

  async createUser(userData: { username: string; role?: string; bio?: string; email?: string }): Promise<{ user: User }> {
    return this.request('/auth/users', {
      method: 'POST',
      body: JSON.stringify(userData),
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

  async createRole(roleData: { name: string; permissions?: Permission[] }): Promise<{ role: Role }> {
    return this.request('/roles', {
      method: 'POST',
      body: JSON.stringify(roleData),
    });
  }

  async addPermissionToRole(roleId: string, permission: Permission): Promise<{ role: Role }> {
    return this.request(`/roles/${roleId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({ permission }),
    });
  }

  async removePermissionFromRole(roleId: string, permission: Permission): Promise<{ role: Role }> {
    return this.request(`/roles/${roleId}/permissions`, {
      method: 'DELETE',
      body: JSON.stringify({ permission }),
    });
  }

  async getUserPermissions(userId: string): Promise<{ permissions: Permission[] }> {
    return this.request(`/roles/user/${userId}/permissions`);
  }

  async updateRole(roleId: string, updates: { name?: string }): Promise<{ role: Role }> {
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

  async hasPermission(permission: Permission): Promise<boolean> {
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
}

export const apiService = new ApiService();