import React, { useState, useEffect } from 'react';
import { Input, Button } from 'antd';
import { SendOutlined, UserOutlined } from '@ant-design/icons';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import LoginModal from './LoginModal';

const MessageInput: React.FC = () => {
  const { activeChannelId, addMessage, channels } = useChat();
  const { user, isAuthenticated } = useAuth();
  const [message, setMessage] = useState('');
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [canSendMessages, setCanSendMessages] = useState(false);

  const activeChannel = channels.find(ch => ch.id === activeChannelId);
  const isChannelReadOnly = activeChannel?.isReadOnly || false;

  useEffect(() => {
    const checkSendPermission = async () => {
      if (!user) return;
      
      try {
        const permission = await apiService.hasPermission('send_messages');
        setCanSendMessages(permission);
      } catch (error) {
        console.error('Error checking send permission:', error);
        setCanSendMessages(false);
      }
    };

    checkSendPermission();
  }, [user]);

  // Сохраняем/загружаем черновики для каждого канала
  useEffect(() => {
    if (activeChannelId) {
      const saved = localStorage.getItem(`draft_${activeChannelId}`);
      if (saved) {
        setMessage(saved);
      } else {
        setMessage('');
      }
    }
  }, [activeChannelId]);

  // Сохраняем черновик при изменении сообщения
  useEffect(() => {
    if (activeChannelId && message.trim()) {
      localStorage.setItem(`draft_${activeChannelId}`, message);
    } else if (activeChannelId && !message.trim()) {
      localStorage.removeItem(`draft_${activeChannelId}`);
    }
  }, [message, activeChannelId]);

  const handleSend = () => {
    if (message.trim() && activeChannelId && user && isAuthenticated) {
      addMessage(activeChannelId, message.trim());
      setMessage('');
      // Удаляем черновик после отправки
      localStorage.removeItem(`draft_${activeChannelId}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!activeChannelId) {
    return (
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        height: '48px'
      }}>
        <Input
          placeholder="Выберите канал"
          disabled
          style={{ 
            border: 'none', 
            borderRadius: 0,
            height: '100%'
          }}
        />
        <div style={{ 
          width: '48px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'inherit'
        }}>
          <Button 
            type="text"
            icon={<UserOutlined />}
            onClick={() => setLoginModalOpen(true)}
            size="small"
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      minHeight: '48px'
    }}>
      <Input.TextArea
        placeholder={
          isChannelReadOnly 
            ? "Канал закрыт для записи"
            : "Введите сообщение..."
        }
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onPressEnter={handleKeyPress}
        disabled={!isAuthenticated || !canSendMessages || isChannelReadOnly}
        autoSize={{ minRows: 1, maxRows: 4 }}
        style={{ 
          border: 'none',
          borderRadius: 0,
          resize: 'none',
          minHeight: '48px',
          padding: '12px'
        }}
      />
      <div style={{ 
        width: '48px',
        minHeight: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'inherit'
      }}>
        {isAuthenticated && user ? (
          <Button 
            type="text"
            icon={<SendOutlined />}
            onClick={handleSend}
            disabled={!message.trim() || !canSendMessages || isChannelReadOnly}
            size="small"
          />
        ) : (
          <Button 
            type="text"
            icon={<UserOutlined />}
            onClick={() => setLoginModalOpen(true)}
            size="small"
          />
        )}
      </div>
      
      <LoginModal 
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </div>
  );
};

export default MessageInput;