import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface Channel {
  id: string;
  name: string;
  isPinned: boolean;
  createdBy: string;
  createdAt: string;
}

interface Message {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
  isPinned: boolean;
}

interface SimpleChatContextType {
  channels: Channel[];
  messages: Message[];
  activeChannelId: string | null;
}

const SimpleChatContext = createContext<SimpleChatContextType | undefined>(undefined);

export const useSimpleChat = () => {
  const context = useContext(SimpleChatContext);
  if (context === undefined) {
    throw new Error('useSimpleChat must be used within a SimpleChatProvider');
  }
  return context;
};

interface SimpleChatProviderProps {
  children: ReactNode;
}

export const SimpleChatProvider: React.FC<SimpleChatProviderProps> = ({ children }) => {
  console.log('SimpleChatProvider rendering...');
  
  const [channels] = useState<Channel[]>([
    {
      id: '1',
      name: 'general',
      isPinned: true,
      createdBy: 'system',
      createdAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: '2',
      name: 'random',
      isPinned: false,
      createdBy: 'system',
      createdAt: '2024-01-01T00:00:00.000Z',
    },
  ]);

  const [messages] = useState<Message[]>([
    {
      id: '1',
      channelId: '1',
      userId: 'system',
      username: 'System',
      content: 'Добро пожаловать в чат!',
      timestamp: '2024-01-01T00:00:00.000Z',
      isPinned: false,
    },
  ]);

  const [activeChannelId] = useState<string | null>('1');

  const value: SimpleChatContextType = {
    channels,
    messages,
    activeChannelId,
  };

  console.log('SimpleChatProvider value:', value);

  return <SimpleChatContext.Provider value={value}>{children}</SimpleChatContext.Provider>;
};