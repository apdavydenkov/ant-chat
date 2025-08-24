import React, { useState, useEffect } from 'react';
import { 
  Tabs, Card, Button, Input, Select, Table, Modal, message, 
  Switch, Tag, Space, Popconfirm, Form, Checkbox, Tooltip
} from 'antd';
import { 
  UserOutlined, TeamOutlined, MessageOutlined, 
  DeleteOutlined, EditOutlined,
  PlusOutlined, SafetyOutlined, CopyOutlined, ReloadOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { apiService, type Permission, type Role } from '../services/api';
import type { User, Channel, Message } from '../types';

const { TabPane } = Tabs;
const { Option } = Select;

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  
  // State for all data
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  
  // System-protected roles that cannot be modified - computed from loaded roles
  const SYSTEM_PROTECTED_ROLES = roles.filter(role => 
    ['admin', 'user', 'blocked'].includes(role.name)
  ).map(role => role.name);

  // Modal states
  const [createUserModal, setCreateUserModal] = useState(false);
  const [createChannelModal, setCreateChannelModal] = useState(false);
  const [createMessageModal, setCreateMessageModal] = useState(false);
  const [createRoleModal, setCreateRoleModal] = useState(false);
  const [permissionsModal, setPermissionsModal] = useState<{ roleId: string; role: Role } | null>(null);
  
  // Edit modal states
  const [editUserModal, setEditUserModal] = useState<User | null>(null);
  const [editChannelModal, setEditChannelModal] = useState<Channel | null>(null);
  const [editMessageModal, setEditMessageModal] = useState<Message | null>(null);

  // Form states
  const [userForm] = Form.useForm();
  const [channelForm] = Form.useForm();
  const [messageForm] = Form.useForm();
  const [roleForm] = Form.useForm();
  const [permissionsForm] = Form.useForm();
  
  // Edit form states
  const [editUserForm] = Form.useForm();
  const [editChannelForm] = Form.useForm();
  const [editMessageForm] = Form.useForm();

  // Check admin access - перенесем проверку в конец компонента
  const hasAdminAccess = user && user.role === 'admin';

  // Helper functions
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('ID copied to clipboard');
    });
  };

  const renderShortId = (id: string) => {
    const shortId = id.substring(0, 5);
    return (
      <Space>
        <code>{shortId}...</code>
        <Tooltip title="Copy full ID">
          <Button 
            type="text" 
            size="small" 
            icon={<CopyOutlined />}
            onClick={() => copyToClipboard(id)}
          />
        </Tooltip>
      </Space>
    );
  };

  const getUsername = (userId: string) => {
    const foundUser = users.find(u => u.id === userId);
    return foundUser ? foundUser.username : userId;
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [usersData, channelsData, messagesData, rolesData] = await Promise.all([
        apiService.getAllUsers(),
        apiService.getChannels(),
        apiService.getMessages(),
        apiService.getRoles(),
      ]);
      
      setUsers(usersData.users);
      setChannels(channelsData.channels);
      setMessages(messagesData.messages);
      setRoles(rolesData.roles);
    } catch (error) {
      message.error('Failed to load data: ' + error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAdminAccess) {
      loadAllData();
    }
  }, [hasAdminAccess]);

  // User Management Functions
  const handleCreateUser = async (values: any) => {
    try {
      await apiService.createUser(values);
      message.success('User created successfully');
      setCreateUserModal(false);
      userForm.resetFields();
      loadAllData();
    } catch (error) {
      message.error('Failed to create user: ' + error);
    }
  };

  const handleToggleUserBlock = async (userId: string, currentRole: string) => {
    try {
      const newRole = currentRole === 'blocked' ? 'user' : 'blocked';
      await apiService.updateUser(userId, { role: newRole });
      message.success(`User ${newRole === 'blocked' ? 'blocked' : 'unblocked'} successfully`);
      loadAllData();
    } catch (error) {
      message.error('Failed to update user: ' + error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await apiService.deleteUser(userId);
      message.success('User deleted successfully');
      loadAllData();
    } catch (error) {
      message.error('Failed to delete user: ' + error);
    }
  };

  // Channel Management Functions
  const handleCreateChannel = async (values: any) => {
    try {
      await apiService.createChannel(values.name, user.id, values.description);
      message.success('Channel created successfully');
      setCreateChannelModal(false);
      channelForm.resetFields();
      loadAllData();
    } catch (error) {
      message.error('Failed to create channel: ' + error);
    }
  };


  const handleDeleteChannel = async (channelId: string) => {
    try {
      await apiService.deleteChannel(channelId);
      message.success('Channel deleted successfully');
      loadAllData();
    } catch (error) {
      message.error('Failed to delete channel: ' + error);
    }
  };

  // Message Management Functions
  const handleCreateMessage = async (values: any) => {
    try {
      if (!user) return;
      await apiService.createMessage(values.channelId, user.id, user.username, values.content);
      message.success('Message created successfully');
      setCreateMessageModal(false);
      messageForm.resetFields();
      loadAllData();
    } catch (error) {
      message.error('Failed to create message: ' + error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await apiService.deleteMessage(messageId);
      message.success('Message deleted successfully');
      loadAllData();
    } catch (error) {
      message.error('Failed to delete message: ' + error);
    }
  };

  // Role Management Functions
  const handleCreateRole = async (values: any) => {
    try {
      await apiService.createRole(values);
      message.success('Role created successfully');
      setCreateRoleModal(false);
      roleForm.resetFields();
      loadAllData();
    } catch (error) {
      message.error('Failed to create role: ' + error);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      await apiService.deleteRole(roleId);
      message.success('Role deleted successfully');
      loadAllData();
    } catch (error) {
      message.error('Failed to delete role: ' + error);
    }
  };

  // Edit Functions
  const handleEditUser = async (values: any) => {
    if (!editUserModal) return;
    try {
      await apiService.updateUser(editUserModal.id, values);
      message.success('User updated successfully');
      setEditUserModal(null);
      editUserForm.resetFields();
      loadAllData();
    } catch (error) {
      message.error('Failed to update user: ' + error);
    }
  };

  const handleEditChannel = async (values: any) => {
    if (!editChannelModal) return;
    try {
      await apiService.updateChannel(editChannelModal.id, values);
      message.success('Channel updated successfully');
      setEditChannelModal(null);
      editChannelForm.resetFields();
      loadAllData();
    } catch (error) {
      message.error('Failed to update channel: ' + error);
    }
  };

  const handleEditMessage = async (values: any) => {
    if (!editMessageModal) return;
    try {
      await apiService.updateMessage(editMessageModal.id, values);
      message.success('Message updated successfully');
      setEditMessageModal(null);
      editMessageForm.resetFields();
      loadAllData();
    } catch (error) {
      message.error('Failed to update message: ' + error);
    }
  };

  const handleUpdateRolePermissions = async (roleId: string, permissions: Permission[], name?: string) => {
    try {
      const currentRole = roles.find(r => r.id === roleId);
      if (!currentRole) return;

      // Update role name if provided
      if (name && name.trim() && name !== currentRole.name) {
        await apiService.updateRole(roleId, { name: name.trim() });
      }

      // Find permissions to add and remove
      const toAdd = permissions.filter(p => !currentRole.permissions.includes(p));
      const toRemove = currentRole.permissions.filter(p => !permissions.includes(p));

      // Add new permissions
      for (const permission of toAdd) {
        await apiService.addPermissionToRole(roleId, permission);
      }

      // Remove old permissions
      for (const permission of toRemove) {
        await apiService.removePermissionFromRole(roleId, permission);
      }

      message.success('Role updated successfully');
      setPermissionsModal(null);
      loadAllData();
    } catch (error) {
      message.error('Failed to update role: ' + error);
    }
  };

  const availablePermissions: Permission[] = [
    'account_access',
    'send_messages',
    'pin_messages',
    'delete_messages', 
    'create_channels',
    'delete_channels',
    'pin_channels',
    'block_users'
  ];

  const permissionLabels = {
    'account_access': 'Account Access',
    'send_messages': 'Send Messages',
    'pin_messages': 'Pin Messages',
    'delete_messages': 'Delete Messages',
    'create_channels': 'Create Channels', 
    'delete_channels': 'Delete Channels',
    'pin_channels': 'Pin Channels',
    'block_users': 'Block Users'
  };

  // User Table Columns
  const userColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', render: (id: string) => renderShortId(id) },
    { title: 'Username', dataIndex: 'username', key: 'username' },
    { title: 'Role', dataIndex: 'role', key: 'role',
      render: (role: string) => <Tag color={role === 'admin' ? 'red' : 'blue'}>{role}</Tag>
    },
    { title: 'Status', dataIndex: 'isBlocked', key: 'isBlocked',
      render: (isBlocked: boolean) => (
        <Tag color={isBlocked ? 'red' : 'green'}>
          {isBlocked ? 'Blocked' : 'Active'}
        </Tag>
      )
    },
    { title: 'Joined', dataIndex: 'joinedAt', key: 'joinedAt',
      render: (date: string) => new Date(date).toLocaleDateString()
    },
    { title: 'Actions', key: 'actions',
      render: (_: any, record: User) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditUserModal(record);
              editUserForm.setFieldsValue({
                bio: record.bio,
                email: record.email,
                role: record.role
              });
            }}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure?"
            onConfirm={() => handleDeleteUser(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    },
  ];

  // Channel Table Columns  
  const channelColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', render: (id: string) => renderShortId(id) },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Description', dataIndex: 'description', key: 'description', 
      render: (desc: string) => desc ? (desc.length > 50 ? desc.substring(0, 50) + '...' : desc) : '-'
    },
    { title: 'Pinned', dataIndex: 'isPinned', key: 'isPinned',
      render: (isPinned: boolean) => (
        <Tag color={isPinned ? 'gold' : 'default'}>
          {isPinned ? 'Pinned' : 'Normal'}
        </Tag>
      )
    },
    { title: 'Created By', dataIndex: 'createdBy', key: 'createdBy', render: (userId: string) => getUsername(userId) },
    { title: 'Created', dataIndex: 'createdAt', key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString()
    },
    { title: 'Read Only', dataIndex: 'isReadOnly', key: 'isReadOnly',
      render: (isReadOnly: boolean) => (
        <Tag color={isReadOnly ? 'red' : 'green'}>
          {isReadOnly ? 'Closed' : 'Open'}
        </Tag>
      )
    },
    { title: 'Actions', key: 'actions',
      render: (_: any, record: Channel) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditChannelModal(record);
              editChannelForm.setFieldsValue({
                name: record.name,
                description: record.description,
                isPinned: record.isPinned,
                isReadOnly: record.isReadOnly || false
              });
            }}
          >
            Edit
          </Button>
          {record.name !== 'general' && (
            <Popconfirm
              title="Are you sure?"
              onConfirm={() => handleDeleteChannel(record.id)}
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      )
    },
  ];

  // Message Table Columns
  const messageColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', render: (id: string) => renderShortId(id) },
    { title: 'Channel', dataIndex: 'channelId', key: 'channelId',
      render: (channelId: string) => {
        const channel = channels.find(c => c.id === channelId);
        return channel?.name || channelId;
      }
    },
    { title: 'User', dataIndex: 'username', key: 'username' },
    { title: 'Content', dataIndex: 'content', key: 'content', 
      render: (content: string) => {
        const truncated = content.length > 50 ? content.substring(0, 50) + '...' : content;
        return (
          <Space>
            <span>{truncated}</span>
            <Tooltip title="Copy full message">
              <Button 
                type="text" 
                size="small" 
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(content)}
              />
            </Tooltip>
          </Space>
        );
      }
    },
    { title: 'Pinned', dataIndex: 'isPinned', key: 'isPinned',
      render: (isPinned: boolean) => (
        <Tag color={isPinned ? 'gold' : 'default'}>
          {isPinned ? 'Pinned' : 'Normal'}
        </Tag>
      )
    },
    { title: 'Timestamp', dataIndex: 'timestamp', key: 'timestamp',
      render: (date: string) => new Date(date).toLocaleString()
    },
    { title: 'Actions', key: 'actions',
      render: (_: any, record: Message) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditMessageModal(record);
              editMessageForm.setFieldsValue({
                content: record.content,
                isPinned: record.isPinned
              });
            }}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure?"
            onConfirm={() => handleDeleteMessage(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    },
  ];

  // Role Table Columns
  const roleColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', render: (id: string) => renderShortId(id) },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Permissions', dataIndex: 'permissions', key: 'permissions',
      render: (permissions: Permission[]) => (
        <div>
          {permissions.map(permission => (
            <Tag key={permission} color="blue" style={{ margin: '2px' }}>
              {permissionLabels[permission]}
            </Tag>
          ))}
        </div>
      )
    },
    { title: 'Created', dataIndex: 'createdAt', key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString()
    },
    { title: 'Actions', key: 'actions',
      render: (_: any, record: Role) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setPermissionsModal({ roleId: record.id, role: record });
              permissionsForm.setFieldsValue({
                name: record.name,
                permissions: record.permissions
              });
            }}
          >
            Edit Permissions
          </Button>
          {!SYSTEM_PROTECTED_ROLES.includes(record.name) && (
            <Popconfirm
              title="Are you sure?"
              onConfirm={() => handleDeleteRole(record.id)}
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      )
    },
  ];

  // Check admin access after all hooks
  if (!hasAdminAccess) {
    return (
      <Card title="Access Denied" style={{ margin: '20px' }}>
        <p>Only administrators can access this panel.</p>
      </Card>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <Card title="Admin Panel" extra={
        <Tooltip title="Refresh Data">
          <Button 
            type="text" 
            icon={<ReloadOutlined />} 
            onClick={loadAllData} 
            loading={loading}
          />
        </Tooltip>
      }>
        <Tabs defaultActiveKey="users">
          {/* Users Tab */}
          <TabPane 
            tab={<span><UserOutlined style={{ marginRight: 8 }} />Users</span>} 
            key="users"
          >
            <div style={{ marginBottom: '16px' }}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => setCreateUserModal(true)}
              >
                Create User
              </Button>
            </div>
            <Table 
              dataSource={users}
              columns={userColumns}
              rowKey="id"
              loading={loading}
              scroll={{ x: true }}
            />
          </TabPane>

          {/* Channels Tab */}
          <TabPane 
            tab={<span><TeamOutlined style={{ marginRight: 8 }} />Channels</span>} 
            key="channels"
          >
            <div style={{ marginBottom: '16px' }}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => setCreateChannelModal(true)}
              >
                Create Channel
              </Button>
            </div>
            <Table 
              dataSource={channels}
              columns={channelColumns}
              rowKey="id"
              loading={loading}
              scroll={{ x: true }}
            />
          </TabPane>

          {/* Messages Tab */}
          <TabPane 
            tab={<span><MessageOutlined style={{ marginRight: 8 }} />Messages</span>} 
            key="messages"
          >
            <div style={{ marginBottom: '16px' }}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => setCreateMessageModal(true)}
              >
                Create Message
              </Button>
            </div>
            <Table 
              dataSource={messages}
              columns={messageColumns}
              rowKey="id"
              loading={loading}
              scroll={{ x: true }}
            />
          </TabPane>

          {/* Roles Tab */}
          <TabPane 
            tab={<span><SafetyOutlined style={{ marginRight: 8 }} />Roles</span>} 
            key="roles"
          >
            <div style={{ marginBottom: '16px' }}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => setCreateRoleModal(true)}
              >
                Create Role
              </Button>
            </div>
            <Table 
              dataSource={roles}
              columns={roleColumns}
              rowKey="id"
              loading={loading}
              scroll={{ x: true }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* Create User Modal */}
      <Modal
        title="Create User"
        open={createUserModal}
        onCancel={() => setCreateUserModal(false)}
        onOk={() => userForm.submit()}
        destroyOnClose
      >
        <Form
          form={userForm}
          layout="vertical"
          onFinish={handleCreateUser}
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Please enter username' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="role"
            label="Role"
            initialValue="user"
          >
            <Select>
              {roles.map(role => (
                <Option key={role.id} value={role.name}>{role.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="bio" label="Bio">
            <Input.TextArea />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input type="email" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Channel Modal */}
      <Modal
        title="Create Channel"
        open={createChannelModal}
        onCancel={() => setCreateChannelModal(false)}
        onOk={() => channelForm.submit()}
        destroyOnClose
      >
        <Form
          form={channelForm}
          layout="vertical"
          onFinish={handleCreateChannel}
        >
          <Form.Item
            name="name"
            label="Channel Name"
            rules={[{ required: true, message: 'Please enter channel name' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item 
            name="description" 
            label="Description" 
            rules={[{ max: 50, message: 'Description cannot exceed 50 characters' }]}
          >
            <Input.TextArea maxLength={50} showCount />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Role Modal */}
      <Modal
        title="Create Role"
        open={createRoleModal}
        onCancel={() => setCreateRoleModal(false)}
        onOk={() => roleForm.submit()}
        destroyOnClose
      >
        <Form
          form={roleForm}
          layout="vertical"
          onFinish={handleCreateRole}
        >
          <Form.Item
            name="name"
            label="Role Name"
            rules={[{ required: true, message: 'Please enter role name' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="permissions" label="Permissions">
            <Checkbox.Group>
              {availablePermissions.map(permission => (
                <Checkbox key={permission} value={permission}>
                  {permissionLabels[permission]}
                </Checkbox>
              ))}
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Role Permissions Modal */}
      <Modal
        title="Edit Role Permissions"
        open={!!permissionsModal}
        onCancel={() => setPermissionsModal(null)}
        onOk={() => {
          permissionsForm.validateFields().then(values => {
            if (permissionsModal) {
              handleUpdateRolePermissions(permissionsModal.roleId, values.permissions || [], values.name);
            }
          });
        }}
        destroyOnClose
      >
        {permissionsModal && (
          <Form
            form={permissionsForm}
            layout="vertical"
          >
            <Form.Item 
              name="name" 
              label="Role Name"
              rules={[{ required: true, message: 'Please enter role name' }]}
            >
              <Input disabled={SYSTEM_PROTECTED_ROLES.includes(permissionsModal.role.name)} />
            </Form.Item>
            <Form.Item name="permissions" label="Permissions">
              <Checkbox.Group disabled={SYSTEM_PROTECTED_ROLES.includes(permissionsModal.role.name)}>
                {availablePermissions.map(permission => (
                  <Checkbox key={permission} value={permission}>
                    {permissionLabels[permission]}
                  </Checkbox>
                ))}
              </Checkbox.Group>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Edit User Modal */}
      <Modal
        title="Edit User"
        open={!!editUserModal}
        onCancel={() => setEditUserModal(null)}
        onOk={() => editUserForm.submit()}
        destroyOnClose
      >
        <Form
          form={editUserForm}
          layout="vertical"
          onFinish={handleEditUser}
        >
          <Form.Item name="bio" label="Bio">
            <Input.TextArea />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input type="email" />
          </Form.Item>
          <Form.Item name="role" label="Role">
            <Select>
              {roles.map(role => (
                <Select.Option key={role.id} value={role.name}>{role.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="isBlocked" valuePropName="checked">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: 12 }}>Blocked:</span>
              <Switch checkedChildren="Blocked" unCheckedChildren="Active" />
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Channel Modal */}
      <Modal
        title="Edit Channel"
        open={!!editChannelModal}
        onCancel={() => setEditChannelModal(null)}
        onOk={() => editChannelForm.submit()}
        destroyOnClose
      >
        <Form
          form={editChannelForm}
          layout="vertical"
          onFinish={handleEditChannel}
        >
          <Form.Item
            name="name"
            label="Channel Name"
            rules={[{ required: true, message: 'Please enter channel name' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item 
            name="description" 
            label="Description" 
            rules={[{ max: 50, message: 'Description cannot exceed 50 characters' }]}
          >
            <Input.TextArea maxLength={50} showCount />
          </Form.Item>
          <Form.Item name="isPinned" valuePropName="checked">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: 12 }}>Pinned:</span>
              <Switch checkedChildren="Pinned" unCheckedChildren="Normal" />
            </div>
          </Form.Item>
          <Form.Item name="isReadOnly" valuePropName="checked">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: 12 }}>Read Only:</span>
              <Switch checkedChildren="Closed" unCheckedChildren="Open" />
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Message Modal */}
      <Modal
        title="Create Message"
        open={createMessageModal}
        onCancel={() => setCreateMessageModal(false)}
        onOk={() => messageForm.submit()}
        destroyOnClose
      >
        <Form
          form={messageForm}
          layout="vertical"
          onFinish={handleCreateMessage}
        >
          <Form.Item
            name="channelId"
            label="Channel"
            rules={[{ required: true, message: 'Please select a channel' }]}
          >
            <Select placeholder="Select a channel">
              {channels.map(channel => (
                <Option key={channel.id} value={channel.id}>{channel.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="content"
            label="Message Content"
            rules={[{ required: true, message: 'Please enter message content' }]}
          >
            <Input.TextArea rows={4} placeholder="Enter your message..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Message Modal */}
      <Modal
        title="Edit Message"
        open={!!editMessageModal}
        onCancel={() => setEditMessageModal(null)}
        onOk={() => editMessageForm.submit()}
        destroyOnClose
      >
        <Form
          form={editMessageForm}
          layout="vertical"
          onFinish={handleEditMessage}
        >
          <Form.Item
            name="content"
            label="Message Content"
            rules={[{ required: true, message: 'Please enter message content' }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="isPinned" valuePropName="checked">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: 12 }}>Pinned:</span>
              <Switch checkedChildren="Pinned" unCheckedChildren="Normal" />
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminPanel;