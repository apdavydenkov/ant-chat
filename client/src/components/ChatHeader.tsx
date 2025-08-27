import React, { useState, useEffect } from 'react';
import { Layout, Space, Button, Avatar, Dropdown, Typography, Modal, Input, Descriptions, Tag } from 'antd';
import { UserOutlined, LogoutOutlined, ArrowLeftOutlined, SettingOutlined, DisconnectOutlined, LoginOutlined, PlusOutlined, ControlOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useView } from '../contexts/ViewContext';
import { useChat } from '../contexts/ChatContext';
import { apiService } from '../services/api';
import LoginModal from './LoginModal';

const { Header } = Layout;
const { Text } = Typography;

const ChatHeader: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { currentView, goToProfile, goToAdmin, goBack } = useView();
  const { channels, activeChannelId, isServerConnected, connectionError, createChannel } = useChat();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [createChannelModalOpen, setCreateChannelModalOpen] = useState(false);
  const [channelInfoModalOpen, setChannelInfoModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const activeChannel = channels.find(channel => channel.id === activeChannelId);

  useEffect(() => {
    const checkAdminPermissions = async () => {
      if (!user) return;
      
      try {
        // Проверяем есть ли права администратора (блокировка пользователей)
        const hasAdminPermission = await apiService.hasPermission('admin_panel_access');
        setIsAdmin(hasAdminPermission);
      } catch (error) {
        console.error('Error checking admin permissions:', error);
        setIsAdmin(false);
      }
    };

    checkAdminPermissions();
  }, [user]);

  const handleCreateChannel = async () => {
    if (newChannelName.trim() && user) {
      console.log('Creating channel with name:', newChannelName.trim(), 'description:', newChannelDescription.trim());
      await createChannel(newChannelName.trim(), newChannelDescription.trim() || undefined);
      setNewChannelName('');
      setNewChannelDescription('');
      setCreateChannelModalOpen(false);
    }
  };

  const handleChannelTitleClick = () => {
    if (currentView === 'chat' && activeChannel) {
      setChannelInfoModalOpen(true);
    }
  };


  const userMenuItems = [
    {
      key: 'profile',
      label: 'Профиль',
      icon: <SettingOutlined />,
      onClick: () => goToProfile(),
    },
    ...(isAdmin ? [{
      key: 'admin',
      label: 'Админ панель',
      icon: <ControlOutlined />,
      onClick: () => goToAdmin(),
    }] : []),
    {
      key: 'logout',
      label: 'Выйти',
      icon: <LogoutOutlined />,
      onClick: logout,
    },
  ];

  const showBackButton = currentView === 'chat' || currentView === 'profile' || currentView === 'admin';
  
  const getHeaderTitle = () => {
    switch (currentView) {
      case 'chat':
        return activeChannel ? activeChannel.name : 'Чат';
      case 'profile':
        return 'Профиль';
      case 'admin':
        return 'Админ панель';
      case 'channels':
      default:
        return (
          <Space size="small">
            <span>Каналы</span>
            {isAdmin && (
              <Button
                type="text"
                icon={<PlusOutlined />}
                size="small"
                style={{ padding: 0, height: 'auto' }}
                onClick={() => setCreateChannelModalOpen(true)}
              />
            )}
          </Space>
        );
    }
  };

  return (
    <>
      <Header style={{ 
        background: '#fff', 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '48px',
        lineHeight: '48px'
      }}>
        <Space>
          {showBackButton && (
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />}
              onClick={goBack}
            />
          )}
          <Text 
            strong
            style={{ 
              cursor: currentView === 'chat' ? 'pointer' : 'default',
              userSelect: 'none' 
            }}
            onClick={currentView === 'chat' ? handleChannelTitleClick : undefined}
          >
            {getHeaderTitle()}
          </Text>
        </Space>

        <Space>
          {!isServerConnected && !isAdmin && (
            <Button 
              type="text" 
              icon={<DisconnectOutlined />}
              title={connectionError || 'Нет соединения'}
              style={{ color: '#ff4d4f' }}
              size="small"
            />
          )}
          {isAuthenticated && user ? (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Button type="text" size="small">
                <Space size="small">
                  <Avatar 
                    size={24} 
                    icon={<UserOutlined />} 
                    style={isAdmin ? {
                      border: '2px solid #faad14'
                    } : {}}
                  />
                </Space>
              </Button>
            </Dropdown>
          ) : (
            <Button 
              type="text" 
              icon={<LoginOutlined />}
              onClick={() => setLoginModalOpen(true)}
            />
          )}
        </Space>
      </Header>
      
      <LoginModal 
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
      
      
      <Modal
        title="Создать новый канал"
        open={createChannelModalOpen}
        onOk={handleCreateChannel}
        onCancel={() => {
          setCreateChannelModalOpen(false);
          setNewChannelName('');
          setNewChannelDescription('');
        }}
        okText="Создать"
        cancelText="Отмена"
        closable={false}
      >
        <div>
          <Input
            placeholder="Введите название канала"
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            onPressEnter={handleCreateChannel}
            style={{ marginBottom: '12px' }}
          />
          <Input.TextArea
            placeholder="Введите описание канала (необязательно)"
            value={newChannelDescription}
            onChange={(e) => setNewChannelDescription(e.target.value)}
            maxLength={50}
            showCount
            rows={2}
          />
        </div>
      </Modal>
      
      <Modal
        title="Информация о канале"
        open={channelInfoModalOpen}
        onCancel={() => setChannelInfoModalOpen(false)}
        footer={null}
        width={400}
      >
        {activeChannel && (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Название">
              <Space>
                {activeChannel.name}
                {activeChannel.isPinned && <Tag color="gold">Закреплен</Tag>}
                {activeChannel.isReadOnly && <Tag color="red" icon={<LockOutlined />}>Закрыт</Tag>}
              </Space>
            </Descriptions.Item>
            {activeChannel.description && (
              <Descriptions.Item label="Описание">
                {activeChannel.description}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Создан">
              {new Date(activeChannel.createdAt).toLocaleString('ru-RU')}
            </Descriptions.Item>
            <Descriptions.Item label="ID канала">
              <code style={{ fontSize: '11px' }}>{activeChannel.id}</code>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  );
};

export default ChatHeader;