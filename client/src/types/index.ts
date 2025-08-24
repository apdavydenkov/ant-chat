export interface User {
  id: string;
  username: string;
  role: string;
  avatar?: string;
  bio?: string;
  email?: string;
  joinedAt: string;
  lastActive: string;
}

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
  createdAt: string | Date;
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
  userId: string;
  username: string;
  content: string;
  timestamp: string;
  isPinned: boolean;
  editedAt?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  isAuthenticated: boolean;
}

export type ViewType = 'channels' | 'chat' | 'profile' | 'admin';