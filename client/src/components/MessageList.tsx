import React, { useRef, useEffect } from 'react';
import { Typography, Dropdown, Modal, message, type MenuProps } from 'antd';
import { DeleteOutlined, PushpinOutlined, PushpinFilled, CopyOutlined } from '@ant-design/icons';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { useView } from '../contexts/ViewContext';
import type { Message } from '../types';

const { Text } = Typography;

const MessageList: React.FC = () => {
  const { messages, activeChannelId, deleteMessage, pinMessage, unpinMessage } = useChat();
  const { user } = useAuth();
  const { goToProfile } = useView();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const channelMessages = messages.filter(message => message.channelId === activeChannelId);
  const sortedMessages = [...channelMessages].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [channelMessages]);

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

  const getMessageContextMenu = (messageItem: Message): MenuProps['items'] => {
    const isOwner = user?.id === messageItem.userId;
    const canManage = user?.role === 'admin' || isOwner;
    
    const items = [];
    
    // Копирование доступно всем
    items.push({
      key: 'copy',
      label: 'Копировать',
      icon: <CopyOutlined />,
      onClick: () => copyMessageToClipboard(messageItem.content),
    });
    
    // Закрепление только для админов
    if (user?.role === 'admin') {
      items.push({
        key: 'pin',
        label: messageItem.isPinned ? 'Открепить' : 'Закрепить',
        icon: messageItem.isPinned ? <PushpinOutlined /> : <PushpinFilled />,
        onClick: () => handlePinToggle(messageItem.id, messageItem.isPinned),
      });
    }
    
    // Удаление для админов и владельцев сообщений
    if (canManage) {
      items.push({
        key: 'delete',
        label: 'Удалить',
        icon: <DeleteOutlined />,
        onClick: () => {
          if (window.confirm('Удалить сообщение?')) {
            deleteMessage(messageItem.id);
          }
        },
      });
    }
    
    return items;
  };

  const formatTime = (timestamp: string | Date) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMessage = (message: Message) => {
    const isOwner = user?.id === message.userId;
    const isSystem = message.userId === 'system';

    return (
      <Dropdown
        key={message.id}
        menu={{ items: getMessageContextMenu(message) }}
        trigger={['contextMenu']}
        disabled={false}
      >
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
            {!isOwner && !isSystem && (
              <div style={{ marginBottom: '4px' }}>
                <Text 
                  strong 
                  style={{ 
                    fontSize: '12px', 
                    color: '#1890ff', 
                    cursor: 'pointer'
                  }}
                  onClick={() => goToProfile(message.userId)}
                >
                  {message.username}
                </Text>
              </div>
            )}
            
            <div style={{ marginBottom: '4px' }}>
              <Text>{message.content}</Text>
              {message.isPinned && (
                <PushpinFilled 
                  style={{ color: '#faad14', marginLeft: '8px', fontSize: '12px' }} 
                />
              )}
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <Text type="secondary" style={{ fontSize: '10px' }}>
                {formatTime(message.timestamp)}
              </Text>
            </div>
          </div>
        </div>
      </Dropdown>
    );
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
          <div>
            {sortedMessages.map(renderMessage)}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList;