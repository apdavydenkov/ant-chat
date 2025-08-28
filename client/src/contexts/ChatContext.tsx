import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Channel, Message, User } from '../types';
import { apiService } from '../services/api';
import { socketService } from '../services/socket';
import { useAuth } from './AuthContext';

interface UserInfo {
  id: string;
  role: string;
  firstname?: string;
  lastname?: string;
}

interface ChatContextType {
  channels: Channel[];
  messages: Message[];
  activeChannelId: string | null;
  isServerConnected: boolean;
  connectionError: string | null;
  isLoading: boolean;
  createChannel: (name: string, description?: string) => Promise<void>;
  updateChannel: (channelId: string, updates: { name?: string; isPinned?: boolean; isReadOnly?: boolean; description?: string }) => Promise<void>;
  deleteChannel: (channelId: string) => Promise<void>;
  setActiveChannel: (channelId: string | null) => void;
  addMessage: (channelId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  pinMessage: (messageId: string) => Promise<void>;
  unpinMessage: (messageId: string) => Promise<void>;
  pinChannel: (channelId: string) => Promise<void>;
  unpinChannel: (channelId: string) => Promise<void>;
  getUserInfo: (userId: string) => Promise<UserInfo | null>;
  showLoginModal: () => void;
  loginModalVisible: boolean;
  setLoginModalVisible: (visible: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const { user } = useAuth();
  
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(() => {
    return localStorage.getItem('activeChannelId') || null;
  });
  const [isServerConnected, setIsServerConnected] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const showLoginModal = useCallback(() => {
    setLoginModalVisible(true);
  }, []);

  const getUserInfo = useCallback(async (userId: string): Promise<UserInfo | null> => {
    try {
      const { user: userData } = await apiService.getPublicUser(userId);
      return userData;
    } catch (error) {
      console.error('Error loading user info:', userId, error);
      return null;
    }
  }, []);

  const loadChannels = useCallback(async () => {
    try {
      setIsLoading(true);
      const { channels: serverChannels } = await apiService.getChannels();
      setChannels(serverChannels);
      setIsServerConnected(true);
      setConnectionError(null);
    } catch (error) {
      console.error('Failed to load channels:', error);
      setIsServerConnected(false);
      setConnectionError('Нет соединения с сервером. Работаем в офлайн режиме.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setupWebSocketListeners = useCallback(() => {
    socketService.onMessageReceived((message) => {
      setMessages(prev => [...prev, message]);
    });

    socketService.onMessageDeleted(({ messageId }) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    });

    socketService.onMessagePinned(({ messageId, isPinned }) => {
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, isPinned } : m
      ));
    });

    socketService.onChannelCreated((channel) => {
      setChannels(prev => [...prev, channel]);
    });

    socketService.onChannelDeleted(({ channelId }) => {
      setChannels(prev => prev.filter(c => c.id !== channelId));
      setMessages(prev => prev.filter(m => m.channelId !== channelId));
      if (activeChannelId === channelId) {
        setActiveChannelId(null);
      }
    });

    socketService.onChannelUpdated((updatedChannel) => {
      setChannels(prev => prev.map(c => 
        c.id === updatedChannel.id ? updatedChannel : c
      ));
    });
  }, [activeChannelId]);

  const createChannel = useCallback(async (name: string, description?: string) => {
    try {
      const { channel } = await apiService.createChannel(name, description);
      // Channel will be added via WebSocket broadcast, no need to add locally
      if (!isServerConnected) {
        setChannels(prev => [...prev, channel]);
      }
    } catch (error) {
      console.error('Failed to create channel:', error);
    }
  }, [isServerConnected]);

  const updateChannel = useCallback(async (channelId: string, updates: { name?: string; isPinned?: boolean; isReadOnly?: boolean; description?: string }) => {
    try {
      const { channel } = await apiService.updateChannel(channelId, updates);
      setChannels(prev => prev.map(ch => ch.id === channelId ? channel : ch));
    } catch (error) {
      console.error('Failed to update channel:', error);
    }
  }, []);

  const deleteChannel = useCallback(async (channelId: string) => {
    try {
      await apiService.deleteChannel(channelId);
      // Channel deletion will be handled via WebSocket broadcast
      if (!isServerConnected) {
        setChannels(prev => prev.filter(channel => channel.id !== channelId));
        setMessages(prev => prev.filter(message => message.channelId !== channelId));
        if (activeChannelId === channelId) {
          setActiveChannelId(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete channel:', error);
    }
  }, [activeChannelId, isServerConnected]);

  const loadChannelMessages = useCallback(async (channelId: string) => {
    try {
      setIsLoading(true);
      const { messages } = await apiService.getMessagesByChannel(channelId);
      setMessages(messages);
    } catch (error) {
      console.error('Failed to load messages for channel:', channelId, error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setActiveChannel = useCallback((channelId: string | null) => {
    if (activeChannelId) {
      socketService.leaveChannel(activeChannelId);
    }
    
    setActiveChannelId(channelId);
    
    if (channelId) {
      localStorage.setItem('activeChannelId', channelId);
      socketService.joinChannel(channelId);
      loadChannelMessages(channelId);
    } else {
      localStorage.removeItem('activeChannelId');
      setMessages([]);
    }
  }, [activeChannelId, loadChannelMessages]);

  const addMessage = async (channelId: string, content: string) => {
    if (!user?.id) return;

    try {
      const { message } = await apiService.createMessage(channelId, content);
      // Message will be added via WebSocket broadcast, no need to add locally
      // Only add if WebSocket is not connected
      if (!isServerConnected) {
        setMessages(prev => [...prev, message]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await apiService.deleteMessage(messageId);
      // Message deletion will be handled via WebSocket broadcast
      if (!isServerConnected) {
        setMessages(prev => prev.filter(message => message.id !== messageId));
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const pinMessage = async (messageId: string) => {
    try {
      await apiService.updateMessage(messageId, { isPinned: true });
      // Message pin status will be updated via WebSocket broadcast
      if (!isServerConnected) {
        setMessages(prev => prev.map(message => 
          message.id === messageId ? { ...message, isPinned: true } : message
        ));
      }
    } catch (error) {
      console.error('Failed to pin message:', error);
    }
  };

  const unpinMessage = async (messageId: string) => {
    try {
      await apiService.updateMessage(messageId, { isPinned: false });
      // Message pin status will be updated via WebSocket broadcast
      if (!isServerConnected) {
        setMessages(prev => prev.map(message => 
          message.id === messageId ? { ...message, isPinned: false } : message
        ));
      }
    } catch (error) {
      console.error('Failed to unpin message:', error);
    }
  };

  const pinChannel = async (channelId: string) => {
    try {
      const currentChannel = channels.find(ch => ch.id === channelId);
      const { channel } = await apiService.updateChannel(channelId, { 
        isPinned: true,
        name: currentChannel?.name,
        description: currentChannel?.description
      });
      setChannels(prev => prev.map(ch => 
        ch.id === channelId ? channel : ch
      ));
    } catch (error) {
      console.error('Failed to pin channel:', error);
    }
  };

  const unpinChannel = async (channelId: string) => {
    try {
      const currentChannel = channels.find(ch => ch.id === channelId);
      const { channel } = await apiService.updateChannel(channelId, { 
        isPinned: false,
        name: currentChannel?.name,
        description: currentChannel?.description
      });
      setChannels(prev => prev.map(ch => 
        ch.id === channelId ? channel : ch
      ));
    } catch (error) {
      console.error('Failed to unpin channel:', error);
    }
  };

  useEffect(() => {
    // Initialize WebSocket connection
    socketService.connect();
    
    loadChannels();
    setupWebSocketListeners();
    
    return () => {
      socketService.removeAllListeners();
      socketService.disconnect();
    };
  }, []);

  useEffect(() => {
    if (channels.length > 0) {
      if (!activeChannelId) {
        // Если нет активного канала, выбираем первый
        setActiveChannel(channels[0].id);
      } else if (channels.some(ch => ch.id === activeChannelId)) {
        // Если есть сохранённый активный канал и он существует, загружаем его сообщения
        loadChannelMessages(activeChannelId);
      } else {
        // Если сохранённый канал не найден, выбираем первый доступный
        setActiveChannel(channels[0].id);
      }
    }
  }, [channels, activeChannelId, setActiveChannel, loadChannelMessages]);

  const value: ChatContextType = {
    channels,
    messages,
    activeChannelId,
    isServerConnected,
    connectionError,
    isLoading,
    createChannel,
    updateChannel,
    deleteChannel,
    setActiveChannel,
    addMessage,
    deleteMessage,
    pinMessage,
    unpinMessage,
    pinChannel,
    unpinChannel,
    getUserInfo,
    showLoginModal,
    loginModalVisible,
    setLoginModalVisible,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};