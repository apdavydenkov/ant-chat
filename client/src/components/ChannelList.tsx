import React, { useState, useEffect } from 'react';
import { List, Modal, Input, Typography, Dropdown, type MenuProps, message } from 'antd';
import { DeleteOutlined, PushpinOutlined, PushpinFilled, EditOutlined, LockOutlined, CloseOutlined } from '@ant-design/icons';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { useView } from '../contexts/ViewContext';
import { apiService } from '../services/api';

const { Text } = Typography;

const ChannelList: React.FC = () => {
  const { channels, activeChannelId, setActiveChannel, updateChannel, deleteChannel, pinChannel, unpinChannel, messages } = useChat();
  const { user } = useAuth();
  const { goToChat } = useView();
  const [editingChannel, setEditingChannel] = useState<{id: string, name: string} | null>(null);
  const [permissions, setPermissions] = useState<{
    canPinChannels: boolean;
    canDeleteChannels: boolean;
    canCreateChannels: boolean;
  }>({
    canPinChannels: false,
    canDeleteChannels: false,
    canCreateChannels: false,
  });

  useEffect(() => {
    const loadPermissions = async () => {
      if (!user) return;
      
      try {
        const [canPinChannels, canDeleteChannels, canCreateChannels] = await Promise.all([
          apiService.hasPermission('pin_channels'),
          apiService.hasPermission('delete_channels_all'),
          apiService.hasPermission('create_channels')
        ]);
        
        setPermissions({
          canPinChannels,
          canDeleteChannels,
          canCreateChannels
        });
      } catch (error) {
        console.error('Error loading permissions:', error);
      }
    };

    loadPermissions();
  }, [user]);

  const handlePinToggle = (channelId: string, isPinned: boolean) => {
    if (isPinned) {
      unpinChannel(channelId);
    } else {
      pinChannel(channelId);
    }
  };

  const handleRenameChannel = (channel: { id: string; name: string }) => {
    setEditingChannel({ id: channel.id, name: channel.name });
  };

  const handleRenameSubmit = async () => {
    if (editingChannel && editingChannel.name.trim()) {
      try {
        // Находим текущий канал чтобы сохранить его isPinned статус
        const currentChannel = channels.find(ch => ch.id === editingChannel.id);
        await updateChannel(editingChannel.id, { 
          name: editingChannel.name.trim(),
          isPinned: currentChannel?.isPinned || false
        });
        message.success('Канал переименован');
        setEditingChannel(null);
      } catch {
        message.error('Ошибка при переименовании канала');
      }
    }
  };

  const handleRenameCancel = () => {
    setEditingChannel(null);
  };

  const handleToggleReadOnly = (channelId: string, isReadOnly: boolean) => {
    const channel = channels.find(ch => ch.id === channelId);
    if (channel) {
      updateChannel(channelId, { 
        ...channel,
        isReadOnly: !isReadOnly 
      });
      message.success(isReadOnly ? 'Канал открыт для записи' : 'Канал закрыт для записи');
    }
  };

  const handleChannelClick = (channelId: string) => {
    setActiveChannel(channelId);
    goToChat();
  };

  const getLastMessage = (channelId: string) => {
    const channelMessages = messages
      .filter(msg => msg.channelId === channelId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return channelMessages[0];
  };

  const formatLastMessageTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'сейчас';
    if (diffMinutes < 60) return `${diffMinutes}м`;
    if (diffHours < 24) return `${diffHours}ч`;
    if (diffDays < 7) return `${diffDays}д`;
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  };

  const getContextMenuItems = (channel: { id: string; name: string; isPinned: boolean; isReadOnly?: boolean }): MenuProps['items'] => {
    if (!permissions.canPinChannels && !permissions.canDeleteChannels) return [];
    
    const items = [
      {
        key: 'pin',
        label: channel.isPinned ? 'Открепить' : 'Закрепить',
        icon: channel.isPinned ? <PushpinOutlined /> : <PushpinFilled />,
        onClick: () => handlePinToggle(channel.id, channel.isPinned),
      },
      {
        key: 'rename',
        label: 'Переименовать',
        icon: <EditOutlined />,
        onClick: () => handleRenameChannel(channel),
      },
      {
        key: 'toggle-readonly',
        label: channel.isReadOnly ? 'Открыть' : 'Закрыть',
        icon: channel.isReadOnly ? <LockOutlined /> : <CloseOutlined />,
        onClick: () => handleToggleReadOnly(channel.id, channel.isReadOnly || false),
      }
    ];

    if (channel.name !== 'general') {
      items.push({
        key: 'delete',
        label: 'Удалить',
        icon: <DeleteOutlined />,
        onClick: () => {
          if (window.confirm('Удалить канал?')) {
            deleteChannel(channel.id);
          }
        },
      });
    }

    return items;
  };


  const sortedChannels = [...channels].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {sortedChannels.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            color: '#999',
            flexDirection: 'column'
          }}>
            <div>Загрузка каналов...</div>
          </div>
        ) : (
          <List
            size="small"
            dataSource={sortedChannels}
            renderItem={(channel) => (
            <Dropdown
              menu={{ items: getContextMenuItems(channel) }}
              trigger={['contextMenu']}
              disabled={!permissions.canPinChannels && !permissions.canDeleteChannels}
            >
              <List.Item
                style={{
                  cursor: 'pointer',
                  backgroundColor: activeChannelId === channel.id ? '#e6f4ff' : 'transparent',
                  margin: 0,
                }}
                onClick={() => handleChannelClick(channel.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
                      <Text strong={activeChannelId === channel.id}>{channel.name}</Text>
                      {channel.isReadOnly && (
                        <LockOutlined style={{ marginLeft: '4px', color: '#ff4d4f', fontSize: '12px' }} />
                      )}
                    </div>
                    {(() => {
                      const lastMessage = getLastMessage(channel.id);
                      if (lastMessage) {
                        return (
                          <Text 
                            type="secondary" 
                            style={{ 
                              fontSize: '12px',
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              lineHeight: 1.2
                            }}
                          >
                            {lastMessage.content}
                          </Text>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: '8px' }}>
                    {channel.isPinned && <PushpinFilled style={{ color: '#1890ff', fontSize: '12px' }} />}
                    {(() => {
                      const lastMessage = getLastMessage(channel.id);
                      if (lastMessage) {
                        return (
                          <Text 
                            type="secondary" 
                            style={{ 
                              fontSize: '10px',
                              marginTop: channel.isPinned ? '2px' : '0'
                            }}
                          >
                            {formatLastMessageTime(lastMessage.createdAt)}
                          </Text>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </List.Item>
            </Dropdown>
          )}
          />
        )}
      </div>

      <Modal
        title="Переименовать канал"
        open={!!editingChannel}
        onOk={handleRenameSubmit}
        onCancel={handleRenameCancel}
        okText="Сохранить"
        cancelText="Отмена"
        closable={false}
      >
        <Input
          placeholder="Введите новое название канала"
          value={editingChannel?.name || ''}
          onChange={(e) => setEditingChannel(prev => prev ? { ...prev, name: e.target.value } : null)}
          onPressEnter={handleRenameSubmit}
        />
      </Modal>
    </div>
  );
};

export default ChannelList;