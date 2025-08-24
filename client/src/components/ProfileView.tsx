import React, { useState, useEffect } from 'react';
import { Card, Avatar, Typography, Space, Button, Divider, Tag, Form, Input, message, List, Spin, Select, Popover } from 'antd';
import { UserOutlined, CrownOutlined, EditOutlined, SaveOutlined, CloseOutlined, LogoutOutlined, StopOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useView } from '../contexts/ViewContext';
import { apiService } from '../services/api';
import type { User, Role } from '../types';

const { Title, Text } = Typography;

const ProfileView: React.FC = () => {
  const { user: currentUser, logout } = useAuth();
  const { viewingUserId } = useView();
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [form] = Form.useForm();

  const isViewingOwnProfile = !viewingUserId || viewingUserId === currentUser?.id;
  const user = isViewingOwnProfile ? currentUser : viewingUser;

  useEffect(() => {
    if (viewingUserId && viewingUserId !== currentUser?.id) {
      loadUserProfile(viewingUserId);
    }
    loadRoles();
  }, [viewingUserId, currentUser?.id]);

  const loadRoles = async () => {
    try {
      if (!currentUser?.id) return;
      const { roles: rolesData } = await apiService.getRoles();
      setRoles(rolesData);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const loadUserProfile = async (userId: string) => {
    setLoading(true);
    try {
      const { user: userData } = await apiService.getUser(userId);
      setViewingUser(userData);
    } catch (error) {
      console.error('Error loading user profile:', error);
      message.error('Не удалось загрузить профиль пользователя');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) return null;
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" />
      </div>
    );
  }
  if (!user) return null;

  const handleEdit = () => {
    form.setFieldsValue({
      bio: user.bio ?? '',
      email: user.email ?? '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await apiService.updateUser(user.id, values);
      message.success('Профиль обновлен');
      setIsEditing(false);
      // В реальном приложении нужно обновить контекст пользователя
    } catch (error) {
      console.error('Error updating profile:', error);
      message.error('Ошибка при обновлении профиля');
    }
  };

  const handleRoleChange = async (newRole: string) => {
    if (!user || isViewingOwnProfile) return;
    
    try {
      const { user: updatedUser } = await apiService.updateUser(user.id, { role: newRole });
      message.success('Роль пользователя изменена');
      setViewingUser(updatedUser);
    } catch (error) {
      console.error('Error changing user role:', error);
      message.error('Ошибка при изменении роли');
    }
  };

  const getRolePermissions = (roleName: string): string[] => {
    const role = roles.find(r => r.name === roleName);
    return role ? role.permissions : [];
  };


  const getPermissionLabel = (permission: string): string => {
    const labels: Record<string, string> = {
      'account_access': 'Доступ к аккаунту',
      'send_messages': 'Отправка сообщений',
      'pin_messages': 'Закрепление сообщений',
      'delete_messages': 'Удаление сообщений',
      'create_channels': 'Создание каналов',
      'delete_channels': 'Удаление каналов',
      'pin_channels': 'Закрепление каналов',
      'block_users': 'Блокировка пользователей'
    };
    return labels[permission] || permission;
  };


  const handleCancel = () => {
    setIsEditing(false);
    form.resetFields();
  };

  return (
    <div style={{ 
      padding: '12px',
      height: '100%',
      overflow: 'auto'
    }}>

      <Card size="small" style={{ maxWidth: '400px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <Avatar size={60} icon={<UserOutlined />} />
          <Title level={4} style={{ marginTop: '8px', marginBottom: '4px' }}>
            {user.username}
          </Title>
          <Space>
            {!isViewingOwnProfile && currentUser?.role === 'admin' ? (
              <Select
                value={user.role}
                size="small"
                style={{ minWidth: 120 }}
                onChange={handleRoleChange}
              >
                {roles.map(role => (
                  <Select.Option key={role.id} value={role.name}>
                    {role.name === 'admin' && <CrownOutlined style={{ marginRight: 4 }} />}
                    {role.name === 'blocked' && <StopOutlined style={{ marginRight: 4 }} />}
                    {role.name === 'admin' ? 'Администратор' : 
                     role.name === 'user' ? 'Пользователь' : 
                     role.name === 'blocked' ? 'Заблокирован' :
                     role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                  </Select.Option>
                ))}
              </Select>
            ) : (
              <Popover
                content={
                  <div>
                    <Text strong>Права:</Text>
                    <List
                      size="small"
                      style={{ marginTop: 8, minWidth: 200 }}
                      dataSource={getRolePermissions(user.role)}
                      renderItem={(permission) => (
                        <List.Item style={{ padding: '2px 0', fontSize: '12px' }}>
                          • {getPermissionLabel(permission)}
                        </List.Item>
                      )}
                      locale={{
                        emptyText: 'Нет дополнительных прав'
                      }}
                    />
                  </div>
                }
                title="Права роли"
                trigger="click"
              >
                <Tag 
                  color={user.role === 'admin' ? 'gold' : user.role === 'user' ? 'blue' : user.role === 'blocked' ? 'red' : 'purple'} 
                  icon={user.role === 'admin' ? <CrownOutlined /> : user.role === 'blocked' ? <StopOutlined /> : <InfoCircleOutlined />}
                  style={{ cursor: 'pointer' }}
                >
                  {user.role === 'admin' ? 'Администратор' : 
                   user.role === 'user' ? 'Пользователь' : 
                   user.role === 'blocked' ? 'Заблокирован' :
                   (user.role as string).charAt(0).toUpperCase() + (user.role as string).slice(1)}
                </Tag>
              </Popover>
            )}
          </Space>
        </div>

        <div style={{ marginBottom: '16px', textAlign: 'center' }}>
          <Space>
            {!isEditing ? (
              isViewingOwnProfile ? (
                <>
                  <Button size="small" icon={<EditOutlined />} onClick={handleEdit}>
                    Редактировать
                  </Button>
                  <Button 
                    type="primary" 
                    danger 
                    size="small"
                    icon={<LogoutOutlined />}
                    onClick={logout}
                  >
                    Выйти
                  </Button>
                </>
              ) : null
            ) : (
              <>
                <Button size="small" icon={<SaveOutlined />} type="primary" onClick={handleSave}>
                  Сохранить
                </Button>
                <Button size="small" icon={<CloseOutlined />} onClick={handleCancel}>
                  Отмена
                </Button>
              </>
            )}
          </Space>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {!isEditing || !isViewingOwnProfile ? (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <Text strong>О себе:</Text>
              <br />
              <Text>{user.bio || 'Не указано'}</Text>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong>Email:</Text>
                  <Text>{user.email || 'Не указан'}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong>Дата регистрации:</Text>
                  <Text type="secondary">
                    {new Date(user.joinedAt).toLocaleDateString('ru-RU')}
                  </Text>
                </div>
              </Space>
            </div>
          </div>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item label="О себе" name="bio">
              <Input.TextArea placeholder="Расскажите о себе" rows={3} />
            </Form.Item>
            <Form.Item label="Email" name="email" rules={[{ type: 'email', message: 'Неверный формат email' }]}>
              <Input placeholder="Введите email" />
            </Form.Item>
          </Form>
        )}


      </Card>
    </div>
  );
};

export default ProfileView;