import { promises as fs } from 'fs';
import * as fsExtra from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'system' | 'messages' | 'channels' | 'users' | 'roles' | 'admin';
  is_basic: boolean;
  created_at: Date;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  type: 'default' | 'custom';
  permissions: string[]; // Permission IDs
  created_at: Date;
}

export interface User {
  id: string;
  username: string;
  role: string;
  avatar?: string;
  bio?: string;
  email?: string;
  joinedAt: Date;
  lastActive: Date;
}

export interface Channel {
  id: string;
  name: string;
  isPinned: boolean;
  createdBy: string;
  createdAt: Date;
  description?: string;
  isReadOnly?: boolean;
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  isPinned: boolean;
  editedAt?: Date;
}

class MockDB {
  private dbPath: string;
  private usersFile: string;
  private channelsFile: string;
  private messagesFile: string;
  private rolesFile: string;
  private permissionsFile: string;

  constructor() {
    this.dbPath = path.join(__dirname, 'data');
    this.usersFile = path.join(this.dbPath, 'users.json');
    this.channelsFile = path.join(this.dbPath, 'channels.json');
    this.messagesFile = path.join(this.dbPath, 'messages.json');
    this.rolesFile = path.join(this.dbPath, 'roles.json');
    this.permissionsFile = path.join(this.dbPath, 'permissions.json');
    // Init will be called lazily when needed
  }

  private async init() {
    await fsExtra.ensureDir(this.dbPath);
    
    // Initialize with default data if files don't exist
    if (!await fsExtra.pathExists(this.usersFile)) {
      await this.writeData(this.usersFile, []);
    }

    if (!await fsExtra.pathExists(this.permissionsFile)) {
      await this.initializePermissions();
    }

    if (!await fsExtra.pathExists(this.rolesFile)) {
      await this.initializeRoles();
    }
    
    if (!await fsExtra.pathExists(this.channelsFile)) {
      // Start with empty channels - users/admins will create them
      await this.writeData(this.channelsFile, []);
    }
    
    if (!await fsExtra.pathExists(this.messagesFile)) {
      // Start with empty messages - users will create them
      await this.writeData(this.messagesFile, []);
    }
  }

  private async initializePermissions() {
    const permissions: Permission[] = [
      // SYSTEM
      { id: '1', name: 'account_access', description: 'Базовый доступ к системе', category: 'system', is_basic: true, created_at: new Date() },
      
      // MESSAGES
      { id: '2', name: 'send_messages', description: 'Отправка сообщений в чаты', category: 'messages', is_basic: true, created_at: new Date() },
      { id: '3', name: 'edit_messages_self', description: 'Редактирование своих сообщений', category: 'messages', is_basic: true, created_at: new Date() },
      { id: '4', name: 'edit_messages_all', description: 'Редактирование любых сообщений', category: 'messages', is_basic: false, created_at: new Date() },
      { id: '5', name: 'delete_messages_self', description: 'Удаление своих сообщений', category: 'messages', is_basic: true, created_at: new Date() },
      { id: '6', name: 'delete_messages_all', description: 'Удаление любых сообщений', category: 'messages', is_basic: false, created_at: new Date() },
      { id: '7', name: 'pin_messages', description: 'Закрепление/открепление сообщений', category: 'messages', is_basic: false, created_at: new Date() },
      
      // CHANNELS
      { id: '8', name: 'view_channels', description: 'Просмотр списка каналов', category: 'channels', is_basic: true, created_at: new Date() },
      { id: '9', name: 'create_channels', description: 'Создание новых каналов', category: 'channels', is_basic: false, created_at: new Date() },
      { id: '10', name: 'edit_channels_self', description: 'Редактирование созданных собой каналов', category: 'channels', is_basic: false, created_at: new Date() },
      { id: '11', name: 'edit_channels_all', description: 'Редактирование любых каналов', category: 'channels', is_basic: false, created_at: new Date() },
      { id: '12', name: 'delete_channels_self', description: 'Удаление созданных собой каналов', category: 'channels', is_basic: false, created_at: new Date() },
      { id: '13', name: 'delete_channels_all', description: 'Удаление любых каналов', category: 'channels', is_basic: false, created_at: new Date() },
      { id: '14', name: 'pin_channels', description: 'Закрепление/открепление каналов', category: 'channels', is_basic: false, created_at: new Date() },
      { id: '15', name: 'close_channels_self', description: 'Установка режима \"только чтение\" для созданных собой каналов', category: 'channels', is_basic: false, created_at: new Date() },
      { id: '16', name: 'close_channels_all', description: 'Установка режима \"только чтение\" для любых каналов', category: 'channels', is_basic: false, created_at: new Date() },
      
      // USERS
      { id: '17', name: 'view_users_self', description: 'Просмотр своего профиля', category: 'users', is_basic: true, created_at: new Date() },
      { id: '18', name: 'view_users_all', description: 'Просмотр профилей всех пользователей', category: 'users', is_basic: false, created_at: new Date() },
      { id: '19', name: 'edit_users_self', description: 'Редактирование своего профиля, НЕ включая роль', category: 'users', is_basic: true, created_at: new Date() },
      { id: '20', name: 'edit_users_all', description: 'Редактирование профилей всех пользователей, НЕ включая роль', category: 'users', is_basic: false, created_at: new Date() },
      { id: '21', name: 'create_users', description: 'Создание новых пользователей', category: 'users', is_basic: false, created_at: new Date() },
      { id: '22', name: 'delete_users', description: 'Удаление пользователей', category: 'users', is_basic: false, created_at: new Date() },
      
      // ROLES
      { id: '23', name: 'change_roles', description: 'Изменение ролей пользователей', category: 'roles', is_basic: false, created_at: new Date() },
      { id: '24', name: 'view_roles', description: 'Просмотр списка ролей', category: 'roles', is_basic: false, created_at: new Date() },
      { id: '25', name: 'create_roles', description: 'Создание новых ролей', category: 'roles', is_basic: false, created_at: new Date() },
      { id: '26', name: 'edit_roles', description: 'Редактирование ролей', category: 'roles', is_basic: false, created_at: new Date() },
      { id: '27', name: 'delete_roles', description: 'Удаление ролей', category: 'roles', is_basic: false, created_at: new Date() },
      { id: '28', name: 'manage_permissions', description: 'Управление разрешениями ролей', category: 'roles', is_basic: false, created_at: new Date() },
      
      // ADMIN
      { id: '29', name: 'admin_panel_access', description: 'Доступ к административной панели', category: 'admin', is_basic: false, created_at: new Date() }
    ];
    await this.writeData(this.permissionsFile, permissions);
  }

  private async initializeRoles() {
    const permissions = await this.getAllPermissions();
    const basicPermissions = permissions.filter(p => p.is_basic).map(p => p.id);
    const allPermissions = permissions.map(p => p.id);

    const roles: Role[] = [
      {
        id: 'admin-role',
        name: 'admin',
        description: 'Суперадминистратор с полными правами',
        type: 'default',
        permissions: allPermissions,
        created_at: new Date()
      },
      {
        id: 'user-role',
        name: 'user',
        description: 'Стандартные пользователи',
        type: 'default',
        permissions: basicPermissions,
        created_at: new Date()
      },
      {
        id: 'blocked-role',
        name: 'blocked',
        description: 'Заблокированные пользователи',
        type: 'default',
        permissions: [], // No permissions = blocked
        created_at: new Date()
      }
    ];
    await this.writeData(this.rolesFile, roles);
  }

  private async readData<T>(filePath: string): Promise<T[]> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async writeData<T>(filePath: string, data: T[]): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  private async ensureInit() {
    if (!await fsExtra.pathExists(this.dbPath)) {
      await this.init();
    }
  }

  // Users
  async getAllUsers(): Promise<User[]> {
    await this.ensureInit();
    console.log(`DEBUG: Reading users from file: ${this.usersFile}`);
    const users = await this.readData<User>(this.usersFile);
    console.log(`DEBUG: Raw users data:`, JSON.stringify(users, null, 2));
    return users;
  }

  async getUserById(id: string): Promise<User | null> {
    const users = await this.getAllUsers();
    return users.find(user => user.id === id) || null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const users = await this.getAllUsers();
    console.log(`DEBUG: Looking for user ${username}, found ${users.length} users total`);
    console.log(`DEBUG: Users in database:`, users.map(u => ({ id: u.id, username: u.username, role: u.role })));
    const found = users.find(user => user.username === username) || null;
    console.log(`DEBUG: Found user: ${found ? found.id : 'NOT FOUND'}`);
    return found;
  }

  async createUser(userData: Partial<User>): Promise<User> {
    const users = await this.getAllUsers();
    const newUser: User = {
      id: uuidv4(),
      username: userData.username!,
      role: userData.role || 'user',
      bio: userData.bio ?? '',
      email: userData.email ?? '',
      joinedAt: new Date(),
      lastActive: new Date(),
      ...userData
    };
    users.push(newUser);
    await this.writeData(this.usersFile, users);
    return newUser;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const users = await this.getAllUsers();
    const userIndex = users.findIndex(user => user.id === id);
    if (userIndex === -1) return null;
    
    // Protect admin users from role change
    if (users[userIndex].role === 'admin' && updates.role && updates.role !== 'admin') {
      console.log('Cannot change admin user role');
      return null;
    }
    
    users[userIndex] = { ...users[userIndex], ...updates, lastActive: new Date() };
    await this.writeData(this.usersFile, users);
    return users[userIndex];
  }

  // Channels
  async getAllChannels(): Promise<Channel[]> {
    return await this.readData<Channel>(this.channelsFile);
  }

  async getChannelById(id: string): Promise<Channel | null> {
    const channels = await this.getAllChannels();
    return channels.find(channel => channel.id === id) || null;
  }

  async createChannel(channelData: Partial<Channel>): Promise<Channel> {
    const channels = await this.getAllChannels();
    const newChannel: Channel = {
      id: uuidv4(),
      name: channelData.name!,
      isPinned: false,
      createdBy: channelData.createdBy!,
      createdAt: new Date(),
      description: channelData.description ?? '',
      isReadOnly: false,
      ...channelData
    };
    channels.push(newChannel);
    await this.writeData(this.channelsFile, channels);
    return newChannel;
  }

  async updateChannel(id: string, updates: Partial<Channel>): Promise<Channel | null> {
    const channels = await this.getAllChannels();
    const channelIndex = channels.findIndex(channel => channel.id === id);
    if (channelIndex === -1) return null;
    
    channels[channelIndex] = { ...channels[channelIndex], ...updates };
    await this.writeData(this.channelsFile, channels);
    return channels[channelIndex];
  }

  async deleteChannel(id: string): Promise<boolean> {
    const channels = await this.getAllChannels();
    const filteredChannels = channels.filter(channel => channel.id !== id);
    if (filteredChannels.length === channels.length) return false;
    
    await this.writeData(this.channelsFile, filteredChannels);
    
    // Also delete all messages in this channel
    const messages = await this.getAllMessages();
    const filteredMessages = messages.filter(message => message.channelId !== id);
    await this.writeData(this.messagesFile, filteredMessages);
    
    return true;
  }

  // Messages
  async getAllMessages(): Promise<Message[]> {
    return await this.readData<Message>(this.messagesFile);
  }

  async getMessagesByChannelId(channelId: string): Promise<Message[]> {
    const messages = await this.getAllMessages();
    return messages.filter(message => message.channelId === channelId);
  }

  async createMessage(messageData: Partial<Message>): Promise<Message> {
    const messages = await this.getAllMessages();
    const newMessage: Message = {
      id: uuidv4(),
      channelId: messageData.channelId!,
      userId: messageData.userId!,
      username: messageData.username!,
      content: messageData.content!,
      timestamp: new Date(),
      isPinned: false,
      ...messageData
    };
    messages.push(newMessage);
    await this.writeData(this.messagesFile, messages);
    return newMessage;
  }

  async updateMessage(id: string, updates: Partial<Message>): Promise<Message | null> {
    const messages = await this.getAllMessages();
    const messageIndex = messages.findIndex(message => message.id === id);
    if (messageIndex === -1) return null;
    
    messages[messageIndex] = { ...messages[messageIndex], ...updates, editedAt: new Date() };
    await this.writeData(this.messagesFile, messages);
    return messages[messageIndex];
  }

  async deleteMessage(id: string): Promise<boolean> {
    const messages = await this.getAllMessages();
    const filteredMessages = messages.filter(message => message.id !== id);
    if (filteredMessages.length === messages.length) return false;
    
    await this.writeData(this.messagesFile, filteredMessages);
    return true;
  }

  async deleteUser(id: string): Promise<boolean> {
    const users = await this.getAllUsers();
    const filteredUsers = users.filter(user => user.id !== id);
    if (filteredUsers.length === users.length) return false;
    
    await this.writeData(this.usersFile, filteredUsers);
    return true;
  }

  // Permissions
  async getAllPermissions(): Promise<Permission[]> {
    return await this.readData<Permission>(this.permissionsFile);
  }

  async getPermissionById(id: string): Promise<Permission | null> {
    const permissions = await this.getAllPermissions();
    return permissions.find(perm => perm.id === id) || null;
  }

  async getPermissionByName(name: string): Promise<Permission | null> {
    const permissions = await this.getAllPermissions();
    return permissions.find(perm => perm.name === name) || null;
  }

  async createPermission(permData: { name: string; description: string; category: Permission['category']; is_basic?: boolean }): Promise<Permission> {
    const permissions = await this.getAllPermissions();
    const newPermission: Permission = {
      id: uuidv4(),
      name: permData.name,
      description: permData.description,
      category: permData.category,
      is_basic: permData.is_basic ?? false,
      created_at: new Date()
    };
    permissions.push(newPermission);
    await this.writeData(this.permissionsFile, permissions);
    return newPermission;
  }

  async updatePermission(id: string, updates: { name?: string; description?: string; category?: Permission['category']; is_basic?: boolean }): Promise<Permission | null> {
    const permissions = await this.getAllPermissions();
    const permIndex = permissions.findIndex(perm => perm.id === id);
    if (permIndex === -1) return null;
    
    permissions[permIndex] = { ...permissions[permIndex], ...updates };
    await this.writeData(this.permissionsFile, permissions);
    return permissions[permIndex];
  }

  async deletePermission(id: string): Promise<boolean> {
    const permissions = await this.getAllPermissions();
    const filteredPermissions = permissions.filter(perm => perm.id !== id);
    if (filteredPermissions.length === permissions.length) return false;
    
    await this.writeData(this.permissionsFile, filteredPermissions);
    return true;
  }

  // Roles
  async getAllRoles(): Promise<Role[]> {
    return await this.readData<Role>(this.rolesFile);
  }

  async getRoleById(id: string): Promise<Role | null> {
    const roles = await this.getAllRoles();
    return roles.find(role => role.id === id) || null;
  }

  async getRoleByName(name: string): Promise<Role | null> {
    const roles = await this.getAllRoles();
    return roles.find(role => role.name === name) || null;
  }

  async createRole(roleData: { name: string; description?: string; type?: 'default' | 'custom'; permissions?: string[] }): Promise<Role> {
    const roles = await this.getAllRoles();
    
    // Get basic permissions if no permissions specified
    let permissions = roleData.permissions || [];
    if (!roleData.permissions) {
      const allPermissions = await this.getAllPermissions();
      permissions = allPermissions.filter(p => p.is_basic).map(p => p.id);
    }
    
    const newRole: Role = {
      id: uuidv4(),
      name: roleData.name,
      description: roleData.description || '',
      type: roleData.type || 'custom',
      permissions,
      created_at: new Date()
    };
    roles.push(newRole);
    await this.writeData(this.rolesFile, roles);
    return newRole;
  }

  async addPermissionToRole(roleId: string, permissionId: string): Promise<Role | null> {
    const roles = await this.getAllRoles();
    const roleIndex = roles.findIndex(role => role.id === roleId);
    if (roleIndex === -1) return null;
    
    // Check admin role protection
    if (roles[roleIndex].name === 'admin') {
      console.log('Cannot modify admin role permissions');
      return null;
    }
    
    if (!roles[roleIndex].permissions.includes(permissionId)) {
      roles[roleIndex].permissions.push(permissionId);
      await this.writeData(this.rolesFile, roles);
    }
    return roles[roleIndex];
  }

  async removePermissionFromRole(roleId: string, permissionId: string): Promise<Role | null> {
    const roles = await this.getAllRoles();
    const roleIndex = roles.findIndex(role => role.id === roleId);
    if (roleIndex === -1) return null;
    
    // Check admin role protection
    if (roles[roleIndex].name === 'admin') {
      console.log('Cannot modify admin role permissions');
      return null;
    }
    
    roles[roleIndex].permissions = roles[roleIndex].permissions.filter(p => p !== permissionId);
    await this.writeData(this.rolesFile, roles);
    return roles[roleIndex];
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    const user = await this.getUserById(userId);
    if (!user) return [];
    
    const role = await this.getRoleByName(user.role);
    if (!role) return [];
    
    const allPermissions = await this.getAllPermissions();
    return allPermissions.filter(perm => role.permissions.includes(perm.id));
  }

  async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    console.log(`DEBUG: User ${userId} has ${permissions.length} permissions, checking for ${permissionName}`);
    const hasIt = permissions.some(perm => perm.name === permissionName);
    console.log(`DEBUG: User ${userId} ${hasIt ? 'HAS' : 'DOES NOT HAVE'} permission ${permissionName}`);
    return hasIt;
  }

  async updateRole(id: string, updates: { name?: string; description?: string; permissions?: string[] }): Promise<Role | null> {
    const roles = await this.getAllRoles();
    const roleIndex = roles.findIndex(role => role.id === id);
    if (roleIndex === -1) return null;
    
    // Check admin role protection
    if (roles[roleIndex].name === 'admin') {
      console.log('Cannot modify admin role');
      return null;
    }
    
    // Don't allow changing type for default roles
    if (roles[roleIndex].type === 'default' && updates.name && updates.name !== roles[roleIndex].name) {
      console.log('Cannot rename default roles');
      return null;
    }
    
    roles[roleIndex] = { ...roles[roleIndex], ...updates };
    await this.writeData(this.rolesFile, roles);
    return roles[roleIndex];
  }

  async deleteRole(id: string): Promise<boolean> {
    const roles = await this.getAllRoles();
    const roleToDelete = roles.find(role => role.id === id);
    
    if (!roleToDelete) return false;
    
    // Protect default roles from deletion
    if (roleToDelete.type === 'default') {
      console.log('Cannot delete default roles');
      return false;
    }
    
    const filteredRoles = roles.filter(role => role.id !== id);
    await this.writeData(this.rolesFile, filteredRoles);
    return true;
  }
}

export const db = new MockDB();