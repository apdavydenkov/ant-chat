import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Channel, Message, User } from '../types';
import { apiService } from '../services/api';
import { socketService } from '../services/socket';
import { useAuth } from './AuthContext';

interface ChatContextType {
  channels: Channel[];
  messages: Record<string, Message[]>;
  users: Record<string, User>;
  activeChannelId: string | null;
  isServerConnected: boolean;
  connectionError: string | null;
  isLoading: boolean;
  createChannel: (name: string, description?: string) => Promise<void>;
  updateChannel: (channelId: string, updates: { name?: string; isPinned?: boolean; isReadOnly?: boolean; description?: string }) => Promise<void>;
  deleteChannel: (channelId: string) => Promise<void>;
  setActiveChannel: (channelId: string | null) => void;
  setMessagesForChannel: (channelId: string, messages: Message[]) => void;
  addMessage: (channelId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  pinMessage: (messageId: string) => Promise<void>;
  unpinMessage: (messageId: string) => Promise<void>;
  pinChannel: (channelId: string) => Promise<void>;
  unpinChannel: (channelId: string) => Promise<void>;
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
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [users, setUsers] = useState<Record<string, User>>({});
  const [activeChannelId, setActiveChannelId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('activeChannelId') || null;
    } catch {
      return null;
    }
  });
  const [isServerConnected, setIsServerConnected] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Кэширование
  const getMessagesCacheKey = (channelId: string) => `chat_messages_${channelId}`;
  const USERS_CACHE_KEY = 'chat_users';
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 1 день

  const loadMessagesFromCache = (channelId: string): Message[] => {
    try {
      const cached = localStorage.getItem(getMessagesCacheKey(channelId));
      if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < CACHE_TTL) {
          return data.messages || [];
        } else {
          localStorage.removeItem(getMessagesCacheKey(channelId));
        }
      }
    } catch {}
    return [];
  };

  const loadUsersFromCache = (): Record<string, User> => {
    try {
      const cached = localStorage.getItem(USERS_CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < CACHE_TTL) {
          return data.users || {};
        } else {
          localStorage.removeItem(USERS_CACHE_KEY);
        }
      }
    } catch {}
    return {};
  };

  const saveMessagesToCache = (channelId: string, channelMessages: Message[]) => {
    try {
      const data = {
        messages: channelMessages,
        timestamp: Date.now()
      };
      localStorage.setItem(getMessagesCacheKey(channelId), JSON.stringify(data));
    } catch {}
  };

  const saveUsersToCache = (updatedUsers: Record<string, User>) => {
    try {
      const data = {
        users: updatedUsers,
        timestamp: Date.now()
      };
      localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(data));
    } catch {}
  };

  const showLoginModal = useCallback(() => {
    setLoginModalVisible(true);
  }, []);

  const loadChannels = useCallback(async () => {
    try {
      setIsLoading(true);
      const { channels: serverChannels } = await apiService.getChannels();
      setChannels(serverChannels);
      setIsServerConnected(true);
      setConnectionError(null);
    } catch (error) {
      setIsServerConnected(false);
      setConnectionError('Нет соединения с сервером. Работаем в офлайн режиме.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setupWebSocketListeners = useCallback(() => {
    socketService.onMessageReceived((message) => {
      setMessages(prev => {
        const channelMsgs = [...(prev[message.channelId] || []), message];
        return { ...prev, [message.channelId]: channelMsgs };
      });
    });

    socketService.onMessageDeleted(({ messageId }) => {
      setMessages(prev => {
        const newMessages = { ...prev };
        Object.keys(newMessages).forEach(channelId => {
          newMessages[channelId] = newMessages[channelId].filter(m => m.id !== messageId);
        });
        return newMessages;
      });
    });

    socketService.onMessagePinned(({ messageId, isPinned }) => {
      setMessages(prev => {
        const newMessages = { ...prev };
        Object.keys(newMessages).forEach(channelId => {
          newMessages[channelId] = newMessages[channelId].map(m => 
            m.id === messageId ? { ...m, isPinned } : m
          );
        });
        return newMessages;
      });
    });

    socketService.onChannelCreated((channel) => {
      setChannels(prev => [...prev, channel]);
    });

    socketService.onChannelDeleted(({ channelId }) => {
      setChannels(prev => prev.filter(c => c.id !== channelId));
      setMessages(prev => {
        const { [channelId]: _, ...rest } = prev;
        return rest;
      });
      try {
        localStorage.removeItem(getMessagesCacheKey(channelId));
      } catch {}
      if (activeChannelId === channelId) {
        setActiveChannelId(null);
      }
    });

    socketService.onChannelUpdated((updatedChannel) => {
      setChannels(prev => prev.map(c => 
        c.id === updatedChannel.id ? updatedChannel : c
      ));
    });

    socketService.onUserUpdated((updatedUser) => {
      console.log('ChatContext: User updated via WebSocket', updatedUser.username);
      
      // Обновляем пользователя в кэше сообщений
      setUsers(prev => {
        const updated = { ...prev, [updatedUser.id]: updatedUser };
        saveUsersToCache(updated);
        return updated;
      });
      
      // Обновляем кэш профилей
      try {
        const cached = localStorage.getItem('profiles_cache');
        const data = cached ? JSON.parse(cached) : {};
        data[updatedUser.id] = updatedUser;
        localStorage.setItem('profiles_cache', JSON.stringify(data));
      } catch {}
    });
  }, []);

  const createChannel = useCallback(async (name: string, description?: string) => {
    try {
      const { channel } = await apiService.createChannel(name, description);
      if (!isServerConnected) {
        setChannels(prev => [...prev, channel]);
      }
    } catch {}
  }, [isServerConnected]);

  const updateChannel = useCallback(async (channelId: string, updates: { name?: string; isPinned?: boolean; isReadOnly?: boolean; description?: string }) => {
    try {
      const { channel } = await apiService.updateChannel(channelId, updates);
      setChannels(prev => prev.map(ch => ch.id === channelId ? channel : ch));
    } catch {}
  }, []);

  const deleteChannel = useCallback(async (channelId: string) => {
    try {
      await apiService.deleteChannel(channelId);
      if (!isServerConnected) {
        setChannels(prev => prev.filter(ch => ch.id !== channelId));
        setMessages(prev => {
          const { [channelId]: _, ...rest } = prev;
          return rest;
        });
        if (activeChannelId === channelId) {
          setActiveChannelId(null);
        }
      }
    } catch {}
  }, [activeChannelId, isServerConnected]);

  const setActiveChannel = useCallback((channelId: string | null) => {
    setActiveChannelId(prevId => {
      if (prevId) {
        try {
          socketService.leaveChannel(prevId);
        } catch {}
      }
      
      if (channelId) {
        try {
          localStorage.setItem('activeChannelId', channelId);
          socketService.joinChannel(channelId);
        } catch {}
      } else {
        try {
          localStorage.removeItem('activeChannelId');
        } catch {}
      }
      
      return channelId;
    });
  }, []);

  const setMessagesForChannel = useCallback((channelId: string, newMessages: Message[]) => {
    setMessages(prev => ({ ...prev, [channelId]: newMessages }));
  }, []);

  const addMessage = async (channelId: string, content: string) => {
    if (!user?.id) return;

    try {
      const { message } = await apiService.createMessage(channelId, content);
      if (!isServerConnected) {
        setMessages(prev => {
          const channelMsgs = [...(prev[channelId] || []), message];
          return { ...prev, [channelId]: channelMsgs };
        });
      }
    } catch (error) {
      throw error;
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await apiService.deleteMessage(messageId);
      if (!isServerConnected) {
        setMessages(prev => {
          const newMessages = { ...prev };
          Object.keys(newMessages).forEach(channelId => {
            newMessages[channelId] = newMessages[channelId].filter(m => m.id !== messageId);
          });
          return newMessages;
        });
      }
    } catch {}
  };

  const pinMessage = async (messageId: string) => {
    try {
      await apiService.updateMessage(messageId, { isPinned: true });
      if (!isServerConnected) {
        setMessages(prev => {
          const newMessages = { ...prev };
          Object.keys(newMessages).forEach(channelId => {
            newMessages[channelId] = newMessages[channelId].map(m => 
              m.id === messageId ? { ...m, isPinned: true } : m
            );
          });
          return newMessages;
        });
      }
    } catch {}
  };

  const unpinMessage = async (messageId: string) => {
    try {
      await apiService.updateMessage(messageId, { isPinned: false });
      if (!isServerConnected) {
        setMessages(prev => {
          const newMessages = { ...prev };
          Object.keys(newMessages).forEach(channelId => {
            newMessages[channelId] = newMessages[channelId].map(m => 
              m.id === messageId ? { ...m, isPinned: false } : m
            );
          });
          return newMessages;
        });
      }
    } catch {}
  };

  const toggleChannelPin = useCallback(async (channelId: string, isPinned: boolean) => {
    try {
      const currentChannel = channels.find(ch => ch.id === channelId);
      if (!currentChannel) return;
      const { channel } = await apiService.updateChannel(channelId, { 
        isPinned,
        name: currentChannel.name,
        description: currentChannel.description
      });
      setChannels(prev => prev.map(ch => 
        ch.id === channelId ? channel : ch
      ));
    } catch {}
  }, [channels]);

  const pinChannel = (channelId: string) => toggleChannelPin(channelId, true);
  const unpinChannel = (channelId: string) => toggleChannelPin(channelId, false);

  // Загрузка сообщений с кэшированием
  useEffect(() => {
    if (!activeChannelId) {
      return;
    }

    let cancelled = false;
    
    // Загружаем users глобально из кэша один раз
    if (Object.keys(users).length === 0) {
      const cachedUsers = loadUsersFromCache();
      if (Object.keys(cachedUsers).length > 0) {
        setUsers(cachedUsers);
      }
    }

    // Загружаем messages для channel из кэша
    const cachedMessages = loadMessagesFromCache(activeChannelId);
    if (cachedMessages.length > 0) {
      setMessagesForChannel(activeChannelId, cachedMessages);
    } else {
      setIsLoading(true);
    }

    const loadMessagesForChannel = async (channelId: string) => {
      try {
        if (cancelled) return;
        
        const { messages: channelMessages, users: channelUsers } = await apiService.getMessagesByChannel(channelId, 50, 0);
        
        if (cancelled) return;
        
        setMessagesForChannel(channelId, channelMessages);
        setUsers(prev => {
          const updated = { ...prev, ...channelUsers as Record<string, User> };
          saveUsersToCache(updated);
          return updated;
        });
        saveMessagesToCache(channelId, channelMessages);
        
      } catch {} finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadMessagesForChannel(activeChannelId);
    
    return () => {
      cancelled = true;
    };
  }, [activeChannelId, setMessagesForChannel]);

  useEffect(() => {
    socketService.connect();
    
    loadChannels();
    setupWebSocketListeners();
    
    return () => {
      socketService.removeAllListeners();
      socketService.disconnect();
    };
  }, [loadChannels, setupWebSocketListeners]);

  useEffect(() => {
    if (channels.length > 0 && !activeChannelId) {
      setActiveChannel(channels[0].id);
    } else if (channels.length > 0 && !channels.some(ch => ch.id === activeChannelId)) {
      setActiveChannel(channels[0].id);
    }
  }, [channels, activeChannelId, setActiveChannel]);

  const value: ChatContextType = {
    channels,
    messages,
    users,
    activeChannelId,
    isServerConnected,
    connectionError,
    isLoading,
    createChannel,
    updateChannel,
    deleteChannel,
    setActiveChannel,
    setMessagesForChannel,
    addMessage,
    deleteMessage,
    pinMessage,
    unpinMessage,
    pinChannel,
    unpinChannel,
    showLoginModal,
    loginModalVisible,
    setLoginModalVisible,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};