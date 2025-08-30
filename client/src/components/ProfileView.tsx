import React, { useState, useEffect } from 'react';
import { Card, Avatar, Typography, Space, Button, Divider, Tag, Form, Input, message, List, Spin, Select, Popover } from 'antd';
import { UserOutlined, CrownOutlined, EditOutlined, SaveOutlined, CloseOutlined, LogoutOutlined, StopOutlined, InfoCircleOutlined, CameraOutlined } from '@ant-design/icons';
import AvatarSelector from './AvatarSelector';
import { useAuth } from '../contexts/AuthContext';
import { useView } from '../contexts/ViewContext';
import { apiService } from '../services/api';
import { socketService } from '../services/socket';
import { generateAvatarFromConfig } from '../utils/avatar';
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
  const [avatarSelectorVisible, setAvatarSelectorVisible] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');
  const [form] = Form.useForm();

  // Определяем какой профиль показываем
  const isOwnProfile = !viewingUserId || viewingUserId === currentUser?.id;
  const user = isOwnProfile ? currentUser : viewingUser;
  
  console.log('ProfileView render:', { 
    isOwnProfile, 
    viewingUserId, 
    currentUserId: currentUser?.id, 
    hasViewingUser: !!viewingUser,
    userName: user?.username || 'no user'
  });

  // Очищаем состояние при смене пользователя
  useEffect(() => {
    console.log('ProfileView: viewingUserId changed to', viewingUserId);
    // Очищаем старые данные ПРИ ЛЮБОМ изменении viewingUserId
    setViewingUser(null);
    setLoading(false);
    setPermissionsLoaded(false);
    setRoles([]);
    setPermissions([]);
  }, [viewingUserId]);
  
  // Загрузка данных при монтировании и изменении пользователя
  useEffect(() => {
    if (!currentUser) return;
    
    console.log('ProfileView: Starting data load for user', viewingUserId || 'self');
    loadInitialData();
  }, [viewingUserId, currentUser?.id]);

  // Подписываемся на WebSocket обновления пользователей
  useEffect(() => {
    const handleUserUpdated = (updatedUser: User) => {
      // Обновляем текущий просматриваемый профиль
      if (viewingUserId && updatedUser.id === viewingUserId) {
        setViewingUser(updatedUser);
      }
    };
    
    socketService.onUserUpdated(handleUserUpdated);
    
    return () => {
      socketService.socket?.off('user-updated', handleUserUpdated);
    };
  }, [viewingUserId]);

  const loadInitialData = async () => {
    if (!currentUser) return;
    
    // Грузим чужой профиль только если нужно
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
    // Сначала очищаем старые данные
    setViewingUser(null);
    
    try {
      console.log(`ProfileView: Fetching user ${userId} from database`);
      // ВСЕГДА запрашиваем свежие данные с сервера
      const { user: userData } = await apiService.getUser(userId);
      console.log(`ProfileView: Loaded fresh data for ${userData.username}`);
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
        Promise.resolve(true), // view_roles теперь публичный
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
  const getDisplayName = (user: User): string => {
    return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;
  };

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
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      bio: user.bio ?? '',
    });
    setSelectedAvatar(user.avatar || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      const values = await form.validateFields();
      const updateData = { ...values };
      if (selectedAvatar !== user.avatar) {
        updateData.avatar = selectedAvatar;
      }
      const { user: updatedUser } = await apiService.updateUser(user.id, updateData);
      
      message.success('Профиль обновлен');
      setIsEditing(false);
      
      // Обновляем состояние и в AuthContext, и локально
      if (isOwnProfile) {
        updateUser(updatedUser);
      }
      setViewingUser(updatedUser);
    } catch (error) {
      console.error('Error updating profile:', error);
      message.error('Ошибка при обновлении профиля');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedAvatar(user?.avatar || '');
    form.resetFields();
  };

  const handleAvatarSelect = (avatarConfig: string) => {
    setSelectedAvatar(avatarConfig);
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
          <Form.Item label="Имя" name="firstName">
            <Input placeholder="Введите имя" />
          </Form.Item>
          <Form.Item label="Фамилия" name="lastName">
            <Input placeholder="Введите фамилию" />
          </Form.Item>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong>Имя в Телеграм:</Text>
            <a href={`https://t.me/${user.username}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <Text type="secondary">@{user.username}</Text>
            </a>
          </div>
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
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div>Профиль не найден</div>
      </div>
    );
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
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {(selectedAvatar || user.avatar) ? (
              <img
                src={generateAvatarFromConfig(selectedAvatar || user.avatar || '')}
                alt="Profile Avatar"
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #d9d9d9'
                }}
              />
            ) : (
              <Avatar size={60} icon={<UserOutlined />} />
            )}
            
            {isEditing && isOwnProfile && (
              <Button
                type="primary"
                shape="circle"
                size="small"
                icon={<CameraOutlined />}
                onClick={() => setAvatarSelectorVisible(true)}
                style={{
                  position: 'absolute',
                  bottom: -5,
                  right: -5,
                  zIndex: 1
                }}
              />
            )}
          </div>
          
          <Title level={4} style={{ marginTop: '8px', marginBottom: '4px' }}>
            {getDisplayName(user)}
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
      
      <AvatarSelector
        visible={avatarSelectorVisible}
        onClose={() => setAvatarSelectorVisible(false)}
        onSelect={handleAvatarSelect}
        userId={user.id}
      />
    </div>
  );
};

export default ProfileView;