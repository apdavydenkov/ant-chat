import { promises as fs } from 'fs';
import * as fsExtra from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  constructor() {
    this.dbPath = path.join(__dirname, 'data');
    this.usersFile = path.join(this.dbPath, 'users.json');
    this.channelsFile = path.join(this.dbPath, 'channels.json');
    this.messagesFile = path.join(this.dbPath, 'messages.json');
    this.rolesFile = path.join(this.dbPath, 'roles.json');
    this.init();
  }

  private async init() {
    await fsExtra.ensureDir(this.dbPath);
    
    // Initialize with default data if files don't exist
    if (!await fsExtra.pathExists(this.usersFile)) {
      await this.writeData(this.usersFile, []);
    }

    if (!await fsExtra.pathExists(this.rolesFile)) {
      // Only create essential roles for system functionality
      const defaultRoles: Role[] = [
        {
          id: 'admin-role',
          name: 'admin',
          permissions: ['pin_messages', 'delete_messages', 'create_channels', 'delete_channels', 'pin_channels', 'block_users', 'send_messages', 'account_access'],
          createdAt: new Date()
        },
        {
          id: 'user-role', 
          name: 'user',
          permissions: ['send_messages', 'account_access'],
          createdAt: new Date()
        },
        {
          id: 'blocked-role',
          name: 'blocked',
          permissions: [], // No permissions = blocked
          createdAt: new Date()
        }
      ];
      await this.writeData(this.rolesFile, defaultRoles);
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

  // Users
  async getAllUsers(): Promise<User[]> {
    return await this.readData<User>(this.usersFile);
  }

  async getUserById(id: string): Promise<User | null> {
    const users = await this.getAllUsers();
    return users.find(user => user.id === id) || null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const users = await this.getAllUsers();
    return users.find(user => user.username === username) || null;
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

  async createRole(roleData: { name: string; permissions?: Permission[] }): Promise<Role> {
    const roles = await this.getAllRoles();
    const newRole: Role = {
      id: uuidv4(),
      name: roleData.name,
      permissions: roleData.permissions ?? [],
      createdAt: new Date()
    };
    roles.push(newRole);
    await this.writeData(this.rolesFile, roles);
    return newRole;
  }

  async addPermissionToRole(roleId: string, permission: Permission): Promise<Role | null> {
    const roles = await this.getAllRoles();
    const roleIndex = roles.findIndex(role => role.id === roleId);
    if (roleIndex === -1) return null;
    
    if (!roles[roleIndex].permissions.includes(permission)) {
      roles[roleIndex].permissions.push(permission);
      await this.writeData(this.rolesFile, roles);
    }
    return roles[roleIndex];
  }

  async removePermissionFromRole(roleId: string, permission: Permission): Promise<Role | null> {
    const roles = await this.getAllRoles();
    const roleIndex = roles.findIndex(role => role.id === roleId);
    if (roleIndex === -1) return null;
    
    roles[roleIndex].permissions = roles[roleIndex].permissions.filter(p => p !== permission);
    await this.writeData(this.rolesFile, roles);
    return roles[roleIndex];
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    const user = await this.getUserById(userId);
    if (!user) return [];
    
    const role = await this.getRoleByName(user.role);
    return role ? role.permissions : [];
  }

  async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permission);
  }

  async updateRole(id: string, updates: { name?: string }): Promise<Role | null> {
    const roles = await this.getAllRoles();
    const roleIndex = roles.findIndex(role => role.id === id);
    if (roleIndex === -1) return null;
    
    roles[roleIndex] = { ...roles[roleIndex], ...updates };
    await this.writeData(this.rolesFile, roles);
    return roles[roleIndex];
  }

  async deleteRole(id: string): Promise<boolean> {
    const roles = await this.getAllRoles();
    const filteredRoles = roles.filter(role => role.id !== id);
    if (filteredRoles.length === roles.length) return false;
    
    await this.writeData(this.rolesFile, filteredRoles);
    return true;
  }
}

export const db = new MockDB();