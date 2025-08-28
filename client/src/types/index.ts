export interface User {
  id: string;
  username: string;
  role: string;
  avatar?: string;
  bio?: string;
  joinedAt: string;
  lastActive: string;
  telegramId?: number;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
}

export type PermissionName = 
  | 'account_access'
  | 'send_messages'
  | 'edit_messages_self'
  | 'edit_messages_all'
  | 'delete_messages_self'
  | 'delete_messages_all'
  | 'pin_messages'
  | 'create_channels'
  | 'edit_channels_self'
  | 'edit_channels_all'
  | 'delete_channels_self'
  | 'delete_channels_all'
  | 'pin_channels'
  | 'close_channels_self'
  | 'close_channels_all'
  | 'view_users_self'
  | 'view_users_all'
  | 'edit_users_self'
  | 'edit_users_all'
  | 'create_users'
  | 'delete_users'
  | 'change_roles'
  | 'create_roles'
  | 'edit_roles'
  | 'delete_roles'
  | 'manage_permissions'
  | 'admin_panel_access';

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  isBasic: boolean;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  type: 'default' | 'custom';
  permissions: string[]; // Permission IDs
  createdAt: string;
}

export interface Channel {
  id: string;
  name: string;
  isPinned: boolean;
  createdBy: string;
  createdAt: string;
  description?: string;
  isReadOnly?: boolean;
}

export interface Message {
  id: string;
  channelId: string;
  createdBy: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  editedAt?: string;
}

export interface AuthContextType {
  user: User | null;
  logout: () => void;
  updateUser: (user: User) => void;
  isAuthenticated: boolean;
  telegramLogin: (telegramData: any) => Promise<void>;
}

export type ViewType = 'channels' | 'chat' | 'profile' | 'admin';