import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'system' | 'messages' | 'channels' | 'users' | 'roles' | 'admin';
  isBasic: boolean;
  createdAt: Date;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  type: 'default' | 'custom';
  permissions: string[];
  createdAt: Date;
}

export interface User {
  id: string;
  username: string; // Telegram Field
  role: string;
  bio?: string;
  firstName?: string; // Telegram Field
  lastName?: string; // Telegram Field
  telegramId?: number; // Telegram Field
  avatar?: string;
  photoUrl?: string; // Telegram Field
  joinedAt: Date;
  lastActive: Date;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  isReadOnly?: boolean;
  isPinned: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  channelId: string;
  content: string;
  isPinned: boolean;
  createdBy: string;
  createdAt: Date;
  editedAt?: Date;
}

// Mongoose Schemas
const permissionSchema = new mongoose.Schema<Permission>({
  id: { type: String, required: true, unique: true, default: uuidv4 },
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  category: { type: String, required: true, enum: ['system', 'messages', 'channels', 'users', 'roles', 'admin'] },
  isBasic: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

const roleSchema = new mongoose.Schema<Role>({
  id: { type: String, required: true, unique: true, default: uuidv4 },
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  type: { type: String, required: true, enum: ['default', 'custom'], default: 'custom' },
  permissions: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

const userSchema = new mongoose.Schema<User>({
  id: { type: String, required: true, unique: true, default: uuidv4 },
  username: { type: String, required: true, unique: true },
  role: { type: String, required: true, default: 'user' },
  bio: { type: String, default: '' },
  avatar: { type: String },
  joinedAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  telegramId: { type: Number, unique: true, sparse: true },
  firstName: { type: String },
  lastName: { type: String },
  photoUrl: { type: String }
}, { versionKey: false });

const channelSchema = new mongoose.Schema<Channel>({
  id: { type: String, required: true, unique: true, default: uuidv4 },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  isReadOnly: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

const messageSchema = new mongoose.Schema<Message>({
  id: { type: String, required: true, unique: true, default: uuidv4 },
  channelId: { type: String, required: true },
  content: { type: String, required: true },
  isPinned: { type: Boolean, default: false },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  editedAt: { type: Date }
}, { versionKey: false });

// Models
const PermissionModel = mongoose.model<Permission>('Permission', permissionSchema);
const RoleModel = mongoose.model<Role>('Role', roleSchema);
const UserModel = mongoose.model<User>('User', userSchema);
const ChannelModel = mongoose.model<Channel>('Channel', channelSchema);
const MessageModel = mongoose.model<Message>('Message', messageSchema);

class MongoDB {
  private connected: boolean = false;

  async connect(connectionString: string): Promise<void> {
    if (this.connected) return;

    try {
      await mongoose.connect(connectionString);
      this.connected = true;
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;
    
    await mongoose.disconnect();
    this.connected = false;
    console.log('✅ Disconnected from MongoDB');
  }

  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }
  }

  // Users
  async getAllUsers(): Promise<User[]> {
    this.ensureConnected();
    return await UserModel.find({}).lean<User[]>();
  }

  async getUserById(id: string): Promise<User | null> {
    this.ensureConnected();
    return await UserModel.findOne({ id }).lean<User>();
  }

  async getUserByUsername(username: string): Promise<User | null> {
    this.ensureConnected();
    return await UserModel.findOne({ username }).lean<User>();
  }

  async getUserByTelegramId(telegramId: number): Promise<User | null> {
    this.ensureConnected();
    return await UserModel.findOne({ telegramId }).lean<User>();
  }

  async createUser(userData: Partial<User>): Promise<User> {
    this.ensureConnected();
    const newUser = new UserModel({
      id: uuidv4(),
      username: userData.username!,
      role: userData.role || 'user',
      bio: userData.bio ?? '',
      joinedAt: new Date(),
      lastActive: new Date(),
      telegramId: userData.telegramId,
      firstName: userData.firstName,
      lastName: userData.lastName,
      photoUrl: userData.photoUrl,
      avatar: userData.photoUrl || userData.avatar,
      ...userData
    });
    const saved = await newUser.save();
    return saved.toObject();
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    this.ensureConnected();
    
    const user = await UserModel.findOne({ id }).lean<User>();
    if (!user) return null;
    
    // Protect admin users from role change
    if (user.role === 'admin' && updates.role && updates.role !== 'admin') {
      return null;
    }
    
    const updated = await UserModel.findOneAndUpdate(
      { id },
      { ...updates, lastActive: new Date() },
      { new: true }
    ).lean<User>();
    
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    this.ensureConnected();
    const result = await UserModel.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // Channels
  async getAllChannels(): Promise<Channel[]> {
    this.ensureConnected();
    return await ChannelModel.find({}).lean<Channel[]>();
  }

  async getChannelById(id: string): Promise<Channel | null> {
    this.ensureConnected();
    return await ChannelModel.findOne({ id }).lean<Channel>();
  }

  async createChannel(channelData: Partial<Channel>): Promise<Channel> {
    this.ensureConnected();
    const newChannel = new ChannelModel({
      id: uuidv4(),
      name: channelData.name!,
      isPinned: false,
      createdBy: channelData.createdBy!,
      createdAt: new Date(),
      description: channelData.description ?? '',
      isReadOnly: false,
      ...channelData
    });
    const saved = await newChannel.save();
    return saved.toObject();
  }

  async updateChannel(id: string, updates: Partial<Channel>): Promise<Channel | null> {
    this.ensureConnected();
    const updated = await ChannelModel.findOneAndUpdate(
      { id },
      updates,
      { new: true }
    ).lean<Channel>();
    return updated;
  }

  async deleteChannel(id: string): Promise<boolean> {
    this.ensureConnected();
    const channelResult = await ChannelModel.deleteOne({ id });
    
    if (channelResult.deletedCount > 0) {
      // Also delete all messages in this channel
      await MessageModel.deleteMany({ channelId: id });
      return true;
    }
    
    return false;
  }

  // Messages
  async getAllMessages(): Promise<Message[]> {
    this.ensureConnected();
    return await MessageModel.find({}).lean<Message[]>();
  }

  async getMessagesByChannelId(channelId: string, limit?: number, offset?: number): Promise<Message[]> {
    this.ensureConnected();
    let query = MessageModel.find({ channelId }).sort({ createdAt: -1 });
    
    if (limit !== undefined) {
      query = query.limit(limit);
    }
    if (offset !== undefined) {
      query = query.skip(offset);
    }
    
    const messages = await query.lean<Message[]>();
    return messages.reverse(); // Return in chronological order
  }

  async getMessageCountByChannelId(channelId: string): Promise<number> {
    this.ensureConnected();
    return await MessageModel.countDocuments({ channelId });
  }

  async getUsersByIds(userIds: string[]): Promise<User[]> {
    this.ensureConnected();
    return await UserModel.find({ 
      id: { $in: userIds } 
    }).select('id firstName lastName avatar').lean<User[]>();
  }

  async createMessage(messageData: Partial<Message>): Promise<Message> {
    this.ensureConnected();
    const newMessage = new MessageModel({
      id: uuidv4(),
      channelId: messageData.channelId!,
      createdBy: messageData.createdBy!,
      content: messageData.content!,
      createdAt: new Date(),
      isPinned: false,
      ...messageData
    });
    const saved = await newMessage.save();
    return saved.toObject();
  }

  async updateMessage(id: string, updates: Partial<Message>): Promise<Message | null> {
    this.ensureConnected();
    
    const updateData = { ...updates };
    if (updates.content !== undefined) {
      updateData.editedAt = new Date();
    }
    
    const updated = await MessageModel.findOneAndUpdate(
      { id },
      updateData,
      { new: true }
    ).lean<Message>();
    
    return updated;
  }

  async deleteMessage(id: string): Promise<boolean> {
    this.ensureConnected();
    const result = await MessageModel.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // Permissions
  async getAllPermissions(): Promise<Permission[]> {
    this.ensureConnected();
    return await PermissionModel.find({}).lean<Permission[]>();
  }

  async getPermissionById(id: string): Promise<Permission | null> {
    this.ensureConnected();
    return await PermissionModel.findOne({ id }).lean<Permission>();
  }

  async getPermissionByName(name: string): Promise<Permission | null> {
    this.ensureConnected();
    return await PermissionModel.findOne({ name }).lean<Permission>();
  }

  async createPermission(permData: { name: string; description: string; category: Permission['category']; isBasic?: boolean }): Promise<Permission> {
    this.ensureConnected();
    const newPermission = new PermissionModel({
      id: uuidv4(),
      name: permData.name,
      description: permData.description,
      category: permData.category,
      isBasic: permData.isBasic ?? false,
      createdAt: new Date()
    });
    const saved = await newPermission.save();
    return saved.toObject();
  }

  async updatePermission(id: string, updates: { name?: string; description?: string; category?: Permission['category']; isBasic?: boolean }): Promise<Permission | null> {
    this.ensureConnected();
    const updated = await PermissionModel.findOneAndUpdate(
      { id },
      updates,
      { new: true }
    ).lean<Permission>();
    return updated;
  }

  async deletePermission(id: string): Promise<boolean> {
    this.ensureConnected();
    const result = await PermissionModel.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // Roles
  async getAllRoles(): Promise<Role[]> {
    this.ensureConnected();
    return await RoleModel.find({}).lean<Role[]>();
  }

  async getRoleById(id: string): Promise<Role | null> {
    this.ensureConnected();
    return await RoleModel.findOne({ id }).lean<Role>();
  }

  async getRoleByName(name: string): Promise<Role | null> {
    this.ensureConnected();
    return await RoleModel.findOne({ name }).lean<Role>();
  }

  async createRole(roleData: { name: string; description?: string; type?: 'default' | 'custom'; permissions?: string[] }): Promise<Role> {
    this.ensureConnected();
    
    // Get basic permissions if no permissions specified
    let permissions = roleData.permissions || [];
    if (!roleData.permissions) {
      const allPermissions = await this.getAllPermissions();
      permissions = allPermissions.filter(p => p.isBasic).map(p => p.id);
    }
    
    const newRole = new RoleModel({
      id: uuidv4(),
      name: roleData.name,
      description: roleData.description || '',
      type: roleData.type || 'custom',
      permissions,
      createdAt: new Date()
    });
    const saved = await newRole.save();
    return saved.toObject();
  }

  async addPermissionToRole(roleId: string, permissionId: string): Promise<Role | null> {
    this.ensureConnected();
    
    const role = await RoleModel.findOne({ id: roleId }).lean<Role>();
    if (!role) return null;
    
    // Check admin role protection
    if (role.name === 'admin') {
      return null;
    }
    
    if (!role.permissions.includes(permissionId)) {
      const updated = await RoleModel.findOneAndUpdate(
        { id: roleId },
        { $push: { permissions: permissionId } },
        { new: true }
      ).lean<Role>();
      return updated;
    }
    
    return role;
  }

  async removePermissionFromRole(roleId: string, permissionId: string): Promise<Role | null> {
    this.ensureConnected();
    
    const role = await RoleModel.findOne({ id: roleId }).lean<Role>();
    if (!role) return null;
    
    // Check admin role protection
    if (role.name === 'admin') {
      return null;
    }
    
    const updated = await RoleModel.findOneAndUpdate(
      { id: roleId },
      { $pull: { permissions: permissionId } },
      { new: true }
    ).lean<Role>();
    
    return updated;
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    this.ensureConnected();
    
    const user = await this.getUserById(userId);
    if (!user) return [];
    
    const role = await this.getRoleByName(user.role);
    if (!role) return [];
    
    const allPermissions = await this.getAllPermissions();
    return allPermissions.filter(perm => role.permissions.includes(perm.id));
  }

  async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    this.ensureConnected();
    const permissions = await this.getUserPermissions(userId);
    return permissions.some(perm => perm.name === permissionName);
  }

  async updateRole(id: string, updates: { name?: string; description?: string; permissions?: string[] }): Promise<Role | null> {
    this.ensureConnected();
    
    const role = await RoleModel.findOne({ id }).lean<Role>();
    if (!role) return null;
    
    // Check admin role protection
    if (role.name === 'admin') {
      return null;
    }
    
    // Don't allow changing type for default roles
    if (role.type === 'default' && updates.name && updates.name !== role.name) {
      return null;
    }
    
    const updated = await RoleModel.findOneAndUpdate(
      { id },
      updates,
      { new: true }
    ).lean<Role>();
    
    return updated;
  }

  async deleteRole(id: string): Promise<boolean> {
    this.ensureConnected();
    
    const role = await RoleModel.findOne({ id }).lean<Role>();
    if (!role) return false;
    
    // Protect default roles from deletion
    if (role.type === 'default') {
      return false;
    }
    
    const result = await RoleModel.deleteOne({ id });
    return result.deletedCount > 0;
  }
}

export const db = new MongoDB();