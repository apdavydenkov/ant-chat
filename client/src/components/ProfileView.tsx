import React, { useState, useEffect } from 'react';
import { Card, Avatar, Typography, Space, Button, Divider, Tag, Form, Input, message, List, Spin, Select, Popover } from 'antd';
import { UserOutlined, CrownOutlined, EditOutlined, SaveOutlined, CloseOutlined, LogoutOutlined, StopOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useView } from '../contexts/ViewContext';
import { apiService } from '../services/api';
import type { User, Role, Permission } from '../types';

const { Title, Text } = Typography;

interface UserPermissions {
  canViewPermissions: boolean;
  canEditProfile: boolean;
  canChangeRoles: boolean;
}

const ProfileView: React.FC = () => {
  const { user: currentUser, logout, updateUser } = useAuth();
  const { viewingUserId } = useView();
  
  // Состояние данных
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermissions>({
    canViewPermissions: false,
    canEditProfile: false,
    canChangeRoles: false,
  });
  
  // Состояние UI
  const [loading, setLoading] = useState(false);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();

  // Определяем какой профиль показываем
  const isOwnProfile = !viewingUserId || viewingUserId === currentUser?.id;
  const user = isOwnProfile ? currentUser : viewingUser;

  // Загрузка данных при монтировании и изменении пользователя
  useEffect(() => {
    if (!currentUser) return;
    
    loadInitialData();
  }, [viewingUserId, currentUser?.id]);

  const loadInitialData = async () => {
    if (!currentUser) return;
    
    // Загружаем профиль другого пользователя если нужно
    if (viewingUserId && viewingUserId !== currentUser.id) {
      await loadUserProfile(viewingUserId);
    }
    
    // Загружаем основные данные параллельно
    await Promise.all([
      loadRoles(),
      loadPermissions(),
      loadUserPermissions(),
    ]);
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

  const loadRoles = async () => {
    try {
      const { roles: rolesData } = await apiService.getRoles();
      setRoles(rolesData);
    } catch (error) {
      console.error('Error loading roles:', error);
      setRoles([]);
    }
  };

  const loadPermissions = async () => {
    try {
      const { permissions: permissionsData } = await apiService.getAllPermissions();
      setPermissions(permissionsData);
    } catch (error) {
      console.error('Error loading permissions:', error);
      setPermissions([]);
    }
  };

  const loadUserPermissions = async () => {
    if (!currentUser) return;
    
    try {
      const [canViewPermissions, canEditProfile, canChangeRoles] = await Promise.all([
        apiService.hasPermission('view_roles'),
        apiService.hasPermission('edit_users_all'),
        apiService.hasPermission('change_roles'),
      ]);

      setUserPermissions({
        canViewPermissions,
        canEditProfile,
        canChangeRoles,
      });
      setPermissionsLoaded(true);
    } catch (error) {
      console.error('Error checking user permissions:', error);
      setUserPermissions({
        canViewPermissions: false,
        canEditProfile: false,
        canChangeRoles: false,
      });
      setPermissionsLoaded(true);
    }
  };

  // Вспомогательные функции
  const getRoleDescription = (roleName: string): string => {
    const role = roles.find(r => r.name === roleName);
    return role ? role.description : roleName;
  };

  const getRolePermissions = (roleName: string): string[] => {
    const role = roles.find(r => r.name === roleName);
    return role ? role.permissions : [];
  };

  const getPermissionDescription = (permissionId: string): string => {
    const permission = permissions.find(p => p.id === permissionId);
    return permission ? permission.description : permissionId;
  };

  // Определяем видимость элементов
  const canShowPermissionsIcon = isOwnProfile || userPermissions.canViewPermissions;
  const canShowEditButton = isOwnProfile || userPermissions.canEditProfile;
  const canShowRoleSelect = !isOwnProfile && userPermissions.canChangeRoles;
  const canShowLogoutButton = isOwnProfile;

  // Обработчики событий
  const handleEdit = () => {
    if (!user) return;
    
    form.setFieldsValue({
      bio: user.bio ?? '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      const values = await form.validateFields();
      const { user: updatedUser } = await apiService.updateUser(user.id, values);
      
      message.success('Профиль обновлен');
      setIsEditing(false);
      
      // Обновляем состояние
      if (isOwnProfile) {
        updateUser(updatedUser);
      } else {
        setViewingUser(updatedUser);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      message.error('Ошибка при обновлении профиля');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    form.resetFields();
  };

  const handleRoleChange = async (newRole: string) => {
    if (!user || isOwnProfile) return;
    
    try {
      const { user: updatedUser } = await apiService.updateUserRole(user.id, newRole);
      message.success('Роль пользователя изменена');
      setViewingUser(updatedUser);
    } catch (error) {
      console.error('Error changing user role:', error);
      message.error('Ошибка при изменении роли');
    }
  };

  // Рендер компонентов
  const renderRoleTag = () => {
    if (!user) return null;

    const roleColor = user.role === 'admin' ? 'gold' : 
                     user.role === 'user' ? 'blue' : 
                     user.role === 'blocked' ? 'red' : 'purple';

    const roleIcon = user.role === 'admin' ? <CrownOutlined /> :
                    user.role === 'blocked' ? <StopOutlined /> : 
                    <InfoCircleOutlined />;

    return (
      <Space>
        <Tag
          color={roleColor}
          icon={roleIcon}
          style={{
            border: user.role === 'admin' ? '2px solid #faad14' : undefined
          }}
        >
          {getRoleDescription(user.role)}
        </Tag>
        
        {canShowPermissionsIcon && (
          <Popover
            content={
              <div>
                <List
                  size="small"
                  style={{ width: 400, maxHeight: 300, overflow: 'auto' }}
                  dataSource={getRolePermissions(user.role)}
                  renderItem={(permission) => (
                    <List.Item style={{ padding: '2px 0', fontSize: '12px' }}>
                      • {getPermissionDescription(permission)}
                    </List.Item>
                  )}
                  locale={{
                    emptyText: 'Нет дополнительных прав'
                  }}
                />
                <Text type="secondary" style={{ fontSize: '10px', display: 'block', marginTop: 8 }}>
                  Всего прав: {getRolePermissions(user.role).length}
                </Text>
              </div>
            }
            title="Права роли"
            trigger="click"
          >
            <Button
              type="text"
              size="small"
              icon={<InfoCircleOutlined />}
              style={{ padding: 0, height: 'auto' }}
            />
          </Popover>
        )}
      </Space>
    );
  };

  const renderRoleSelect = () => {
    if (!canShowRoleSelect || !user) return renderRoleTag();

    return (
      <Space>
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
              {role.description || role.name}
            </Select.Option>
          ))}
        </Select>
        
        {canShowPermissionsIcon && (
          <Popover
            content={
              <div>
                <List
                  size="small"
                  style={{ width: 400, maxHeight: 300, overflow: 'auto' }}
                  dataSource={getRolePermissions(user.role)}
                  renderItem={(permission) => (
                    <List.Item style={{ padding: '2px 0', fontSize: '12px' }}>
                      • {getPermissionDescription(permission)}
                    </List.Item>
                  )}
                  locale={{
                    emptyText: 'Нет дополнительных прав'
                  }}
                />
                <Text type="secondary" style={{ fontSize: '10px', display: 'block', marginTop: 8 }}>
                  Всего прав: {getRolePermissions(user.role).length}
                </Text>
              </div>
            }
            title="Права роли"
            trigger="click"
          >
            <Button
              type="text"
              size="small"
              icon={<InfoCircleOutlined />}
              style={{ padding: 0, height: 'auto' }}
            />
          </Popover>
        )}
      </Space>
    );
  };

  const renderActionButtons = () => {
    if (isEditing) {
      return (
        <>
          <Button size="small" icon={<SaveOutlined />} type="primary" onClick={handleSave}>
            Сохранить
          </Button>
          <Button size="small" icon={<CloseOutlined />} onClick={handleCancel}>
            Отмена
          </Button>
        </>
      );
    }

    return (
      <>
        {canShowEditButton && (
          <Button size="small" icon={<EditOutlined />} onClick={handleEdit}>
            Редактировать
          </Button>
        )}
        {canShowLogoutButton && (
          <Button
            type="primary"
            danger
            size="small"
            icon={<LogoutOutlined />}
            onClick={logout}
          >
            Выйти
          </Button>
        )}
      </>
    );
  };

  const renderProfileContent = () => {
    if (!user) return null;

    if (isEditing) {
      return (
        <Form form={form} layout="vertical">
          <Form.Item label="О себе" name="bio">
            <Input.TextArea placeholder="Расскажите о себе" rows={3} />
          </Form.Item>
        </Form>
      );
    }

    return (
      <div>
        <div style={{ marginBottom: '16px' }}>
          <Text strong>О себе:</Text>
          <br />
          <Text>{user.bio || 'Не указано'}</Text>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>Дата регистрации:</Text>
              <Text type="secondary">
                {new Date(user.joinedAt).toLocaleDateString('ru-RU')}
              </Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>Последняя активность:</Text>
              <Text type="secondary">
                {new Date(user.lastActive).toLocaleDateString('ru-RU')}
              </Text>
            </div>
          </Space>
        </div>
      </div>
    );
  };

  // Главный рендер
  if (!currentUser) {
    return null;
  }

  if (loading || roles.length === 0 || !permissionsLoaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div style={{
      padding: '12px',
      height: '100%',
      overflow: 'auto'
    }}>
      <Card size="small" style={{ maxWidth: '400px', margin: '0 auto' }}>
        {/* Заголовок с аватаром и именем */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <Avatar size={60} icon={<UserOutlined />} />
          <Title level={4} style={{ marginTop: '8px', marginBottom: '4px' }}>
            {user.username}
          </Title>
          {renderRoleSelect()}
        </div>

        {/* Кнопки действий */}
        <div style={{ marginBottom: '16px', textAlign: 'center' }}>
          <Space>
            {renderActionButtons()}
          </Space>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* Содержимое профиля */}
        {renderProfileContent()}
      </Card>
    </div>
  );
};

export default ProfileView;