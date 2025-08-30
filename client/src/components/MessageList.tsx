import React, { useRef, useLayoutEffect, useMemo, useState, useEffect } from 'react';
import { Typography, Dropdown, message, Avatar, type MenuProps } from 'antd';
import { DeleteOutlined, PushpinOutlined, PushpinFilled, CopyOutlined, UserOutlined } from '@ant-design/icons';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { useView } from '../contexts/ViewContext';
import { generateAvatarFromConfig } from '../utils/avatar';
import { apiService } from '../services/api';
import type { Message } from '../types';

const { Text } = Typography;

interface MessageItemProps {
  message: Message;
  users: Record<string, any>;
  userId: string | undefined;
  onDelete: (messageId: string) => void;
  onPinToggle: (messageId: string, isPinned: boolean) => void;
  onUsernameClick: (userId: string) => void;
  onCopy: (text: string) => void;
  canDeleteMessage: boolean;
  canPinMessage: boolean;
}

const MessageItem = React.memo(({ message, users, userId, onDelete, onPinToggle, onUsernameClick, onCopy, canDeleteMessage, canPinMessage }: MessageItemProps) => {
  const isOwner = userId === message.createdBy;
  const isSystem = message.createdBy === 'system';
  const displayName = users[message.createdBy] 
    ? [users[message.createdBy].firstName, users[message.createdBy].lastName].filter(Boolean).join(' ') || message.createdBy
    : message.createdBy;
  const userData = users[message.createdBy];

  const formatTime = (timestamp: string | Date) => 
    new Date(timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const getMenuItems = (): MenuProps['items'] => {
    const isOwner = userId === message.createdBy;
    const items = [
      {
        key: 'copy',
        label: 'Копировать',
        icon: <CopyOutlined />,
        onClick: () => onCopy(message.content),
      },
    ];

    if (canPinMessage) {
      items.push({
        key: 'pin',
        label: message.isPinned ? 'Открепить' : 'Закрепить',
        icon: message.isPinned ? <PushpinOutlined /> : <PushpinFilled />,
        onClick: () => onPinToggle(message.id, message.isPinned),
      });
    }

    if ((isOwner && canDeleteMessage) || canDeleteMessage) {
      items.push({
        key: 'delete',
        label: 'Удалить',
        icon: <DeleteOutlined />,
        onClick: () => {
          if (window.confirm('Удалить сообщение?')) {
            onDelete(message.id);
          }
        },
      });
    }

    return items;
  };

  return (
    <Dropdown menu={{ items: getMenuItems() }} trigger={['contextMenu']}>
      <div
        style={{
          padding: '4px 16px',
          display: 'flex',
          justifyContent: isOwner && !isSystem ? 'flex-end' : 'flex-start',
          marginBottom: '8px',
        }}
      >
        <div
          style={{
            maxWidth: '70%',
            padding: '8px 12px',
            borderRadius: '12px',
            backgroundColor: isOwner && !isSystem 
              ? '#dcf8c6' 
              : message.isPinned 
                ? '#fff7e6' 
                : '#ffffff',
            border: '1px solid #e0e0e0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          }}
        >
          {!isSystem && (
            <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flexShrink: 0 }}>
                {userData?.avatar ? (
                  <img
                    src={generateAvatarFromConfig(userData.avatar)}
                    alt="User Avatar"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1px solid #d9d9d9'
                    }}
                  />
                ) : (
                  <Avatar size={24} icon={<UserOutlined />} />
                )}
              </div>
              <Text 
                strong 
                style={{ 
                  fontSize: '12px', 
                  color: '#1890ff', 
                  cursor: userId ? 'pointer' : 'default'
                }}
                onClick={() => onUsernameClick(message.createdBy)}
              >
                {displayName}
              </Text>
            </div>
          )}
          
          <div style={{ marginBottom: '4px' }}>
            <Text>{message.content}</Text>
            {message.isPinned && (
              <PushpinFilled style={{ color: '#faad14', marginLeft: '8px', fontSize: '12px' }} />
            )}
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <Text type="secondary" style={{ fontSize: '10px' }}>
              {formatTime(message.createdAt)}
            </Text>
          </div>
        </div>
      </div>
    </Dropdown>
  );
});

const MessageList: React.FC = () => {
  const { messages, users, activeChannelId, deleteMessage, pinMessage, unpinMessage, showLoginModal } = useChat();
  const { user } = useAuth();
  const { goToProfile } = useView();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [permissions, setPermissions] = useState({
    canDeleteMessagesSelf: false,
    canDeleteMessagesAll: false,
    canPinMessages: false,
  });

  // Загружаем разрешения пользователя
  useEffect(() => {
    const loadPermissions = async () => {
      if (!user) return;
      
      try {
        const [canDeleteSelf, canDeleteAll, canPin] = await Promise.all([
          apiService.hasPermission('delete_messages_self'),
          apiService.hasPermission('delete_messages_all'),
          apiService.hasPermission('pin_messages'),
        ]);
        
        setPermissions({
          canDeleteMessagesSelf: canDeleteSelf,
          canDeleteMessagesAll: canDeleteAll,
          canPinMessages: canPin,
        });
      } catch (error) {
        console.error('Error loading permissions:', error);
      }
    };
    
    loadPermissions();
  }, [user]);

  const channelMessages = useMemo(() => messages[activeChannelId || ''] || [], [messages, activeChannelId]);

  const sortedMessages = useMemo(() => 
    [...channelMessages].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }),
    [channelMessages]
  );

  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sortedMessages.length]);  // Только при изменении длины списка

  const handlePinToggle = (messageId: string, isPinned: boolean) => {
    if (isPinned) {
      unpinMessage(messageId);
    } else {
      pinMessage(messageId);
    }
  };

  const copyMessageToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('Сообщение скопировано');
    }).catch(() => {
      message.error('Не удалось скопировать');
    });
  };

  const handleUsernameClick = (userId: string) => {
    if (user) {
      goToProfile(userId);
    } else {
      showLoginModal();
    }
  };

  if (!activeChannelId) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        color: '#999'
      }}>
        Выберите канал для просмотра сообщений
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
        {sortedMessages.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            color: '#999'
          }}>
            Пока нет сообщений в этом канале
          </div>
        ) : (
          sortedMessages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              users={users}
              userId={user?.id}
              onDelete={deleteMessage}
              onPinToggle={handlePinToggle}
              onUsernameClick={handleUsernameClick}
              onCopy={copyMessageToClipboard}
              canDeleteMessage={permissions.canDeleteMessagesAll || (permissions.canDeleteMessagesSelf && msg.createdBy === user?.id)}
              canPinMessage={permissions.canPinMessages}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList;