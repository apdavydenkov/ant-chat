import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Channel, Message, User } from '../types';
import { apiService } from '../services/api';
import { socketService } from '../services/socket';
import { logger } from '../utils/logger';
import { useAuth } from './AuthContext';

interface ChatContextType {
  channels: Channel[];
  messages: Message[];
  activeChannelId: string | null;
  isServerConnected: boolean;
  connectionError: string | null;
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
  getUserName: (userId: string) => string;
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
  
  // Просто статические данные для тестирования
  const [channels, setChannels] = useState<Channel[]>([]);

  const [messages, setMessages] = useState<Message[]>([]);
  
  // Кеш пользователей для отображения имен
  const [userCache, setUserCache] = useState<Map<string, User>>(new Map());

  const [activeChannelId, setActiveChannelId] = useState<string | null>(() => {
    // Restore active channel from localStorage
    return localStorage.getItem('activeChannelId') || null;
  });

  const [isServerConnected, setIsServerConnected] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Функция для получения пользователя и кеширования
  const loadUser = useCallback(async (userId: string) => {
    if (userCache.has(userId)) {
      return userCache.get(userId)!;
    }

    try {
      const { user: userData } = await apiService.getUser(userId);
      setUserCache(prev => new Map(prev).set(userId, userData));
      return userData;
    } catch (error) {
      console.error('Error loading user:', userId, error);
      return null;
    }
  }, [userCache]);

  // Функция для получения имени пользователя
  const getUserName = useCallback((userId: string): string => {
    const cachedUser = userCache.get(userId);
    if (cachedUser) {
      return cachedUser.username;
    }

    // Загружаем пользователя асинхронно
    loadUser(userId);
    
    // Возвращаем placeholder пока загружается
    return 'Loading...';
  }, [userCache, loadUser]);



  const loadChannels = useCallback(async () => {
    try {
      console.log('Loading channels from server...');
      const { channels: serverChannels } = await apiService.getChannels();
      console.log('Loaded channels:', serverChannels);
      setChannels(serverChannels);
      setIsServerConnected(true);
      setConnectionError(null);
    } catch (error) {
      console.error('Failed to load channels:', error);
      setIsServerConnected(false);
      setConnectionError('Нет соединения с сервером. Работаем в офлайн режиме.');
      
      // Оставляем пустой массив каналов
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
  }, [activeChannelId]);

  const createChannel = useCallback(async (name: string, description?: string) => {
    try {
      logger.info('client', 'CREATE_CHANNEL_START', { name, description });
      const { channel } = await apiService.createChannel(name, description);
      setChannels(prev => [...prev, channel]);
      socketService.sendMessage({ type: 'channel-created', channel });
      logger.info('client', 'CREATE_CHANNEL_SUCCESS', { channelId: channel.id, name });
    } catch (error) {
      logger.error('client', 'CREATE_CHANNEL_FAILED', error);
      console.error('Failed to create channel:', error);
    }
  }, []);

  const updateChannel = useCallback(async (channelId: string, updates: { name?: string; isPinned?: boolean; isReadOnly?: boolean; description?: string }) => {
    try {
      const { channel } = await apiService.updateChannel(channelId, updates);
      setChannels(prev => prev.map(ch => ch.id === channelId ? channel : ch));
      logger.info('client', 'UPDATE_CHANNEL_SUCCESS', { channelId, updates });
    } catch (error) {
      logger.error('client', 'UPDATE_CHANNEL_FAILED', error);
      console.error('Failed to update channel:', error);
    }
  }, []);

  const deleteChannel = useCallback(async (channelId: string) => {
    try {
      await apiService.deleteChannel(channelId);
      setChannels(prev => prev.filter(channel => channel.id !== channelId));
      setMessages(prev => prev.filter(message => message.channelId !== channelId));
      if (activeChannelId === channelId) {
        setActiveChannelId(null);
      }
      // Отправляем событие через сокет
      if (isServerConnected) {
        socketService.sendMessage({ type: 'channel-deleted', data: { channelId } });
      }
    } catch (error) {
      console.error('Failed to delete channel:', error);
    }
  }, [activeChannelId, isServerConnected]);

  const loadChannelMessages = useCallback(async (channelId: string) => {
    try {
      logger.info('client', 'LOAD_MESSAGES_START', { channelId });
      const { messages } = await apiService.getMessagesByChannel(channelId);
      setMessages(messages);
      logger.info('client', 'LOAD_MESSAGES_SUCCESS', { channelId, count: messages.length });
    } catch (error) {
      logger.error('client', 'LOAD_MESSAGES_FAILED', { channelId, error });
      console.error('Failed to load messages for channel:', channelId, error);
    }
  }, []);

  const setActiveChannel = useCallback((channelId: string | null) => {
    logger.info('client', 'SET_ACTIVE_CHANNEL', { from: activeChannelId, to: channelId });
    
    if (activeChannelId) {
      socketService.leaveChannel(activeChannelId);
    }
    
    setActiveChannelId(channelId);
    
    if (channelId) {
      localStorage.setItem('activeChannelId', channelId);
      socketService.joinChannel(channelId);
      // Load messages for the new channel
      loadChannelMessages(channelId);
    } else {
      localStorage.removeItem('activeChannelId');
      setMessages([]); // Clear messages when no channel selected
    }
  }, [activeChannelId, loadChannelMessages]);

  const addMessage = async (channelId: string, content: string) => {
    if (!user?.id) return;
    
    logger.info('client', 'ADD_MESSAGE_START', { channelId, content });
    
    // Создаем локальное сообщение
    const localMessage = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      channelId,
      createdBy: user.id,
      content,
      createdAt: new Date().toISOString(),
      isPinned: false,
    };

    // Сначала добавляем локально для мгновенного отображения
    setMessages(prev => [...prev, localMessage]);
    logger.info('client', 'ADD_MESSAGE_LOCAL', { messageId: localMessage.id });

    if (isServerConnected) {
      try {
        const { message } = await apiService.createMessage(channelId, content);
        // Заменяем локальное сообщение на серверное
        setMessages(prev => prev.map(msg => 
          msg.id === localMessage.id ? message : msg
        ));
        socketService.sendMessage(message);
        logger.info('client', 'ADD_MESSAGE_SUCCESS', { localId: localMessage.id, serverId: message.id });
      } catch (error) {
        logger.error('client', 'ADD_MESSAGE_FAILED', error);
        console.error('Failed to send message:', error);
        setIsServerConnected(false);
        setConnectionError('Нет соединения с сервером. Работаем в офлайн режиме.');
        // Локальное сообщение остается
      }
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await apiService.deleteMessage(messageId);
      setMessages(prev => prev.filter(message => message.id !== messageId));
      // Отправляем событие через сокет
      if (isServerConnected) {
        socketService.sendMessage({ type: 'message-deleted', data: { messageId } });
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const pinMessage = async (messageId: string) => {
    try {
      await apiService.updateMessage(messageId, { isPinned: true });
      setMessages(prev => prev.map(message => 
        message.id === messageId ? { ...message, isPinned: true } : message
      ));
    } catch (error) {
      console.error('Failed to pin message:', error);
    }
  };

  const unpinMessage = async (messageId: string) => {
    try {
      await apiService.updateMessage(messageId, { isPinned: false });
      setMessages(prev => prev.map(message => 
        message.id === messageId ? { ...message, isPinned: false } : message
      ));
    } catch (error) {
      console.error('Failed to unpin message:', error);
    }
  };

  const pinChannel = async (channelId: string) => {
    try {
      // Находим текущий канал чтобы сохранить его поля
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
      // Находим текущий канал чтобы сохранить его поля
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

  // Инициализация - загружаем данные с сервера
  useEffect(() => {
    logger.info('client', 'CHAT_CONTEXT_INIT', 'Initializing ChatContext');
    loadChannels();
    setupWebSocketListeners();
    
    return () => {
      socketService.removeAllListeners();
    };
  }, []);

  // Устанавливаем активный канал если его нет
  useEffect(() => {
    if (!activeChannelId && channels.length > 0) {
      console.log('Auto-selecting first channel:', channels[0]);
      setActiveChannel(channels[0].id);
    }
  }, [channels, activeChannelId, setActiveChannel]);

  const value: ChatContextType = {
    channels,
    messages,
    activeChannelId,
    isServerConnected,
    connectionError,
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
    getUserName,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};