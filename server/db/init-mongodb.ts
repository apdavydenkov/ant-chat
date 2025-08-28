import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { db } from './mongodb.js';

dotenv.config();

async function initialize() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required in environment variables');
  }

  try {
    await db.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for initialization');

    // Check if permissions already exist
    const existingPermissions = await db.getAllPermissions();
    if (existingPermissions.length === 0) {
      const permissions = [
        { name: 'account_access', description: 'Базовый доступ к системе', category: 'system' as const, isBasic: true },
        { name: 'send_messages', description: 'Отправка сообщений в чаты', category: 'messages' as const, isBasic: true },
        { name: 'edit_messages_self', description: 'Редактирование своих сообщений', category: 'messages' as const, isBasic: true },
        { name: 'edit_messages_all', description: 'Редактирование любых сообщений', category: 'messages' as const, isBasic: false },
        { name: 'delete_messages_self', description: 'Удаление своих сообщений', category: 'messages' as const, isBasic: true },
        { name: 'delete_messages_all', description: 'Удаление любых сообщений', category: 'messages' as const, isBasic: false },
        { name: 'pin_messages', description: 'Закрепление/открепление сообщений', category: 'messages' as const, isBasic: false },
        { name: 'create_channels', description: 'Создание новых каналов', category: 'channels' as const, isBasic: false },
        { name: 'edit_channels_self', description: 'Редактирование созданных собой каналов', category: 'channels' as const, isBasic: false },
        { name: 'edit_channels_all', description: 'Редактирование любых каналов', category: 'channels' as const, isBasic: false },
        { name: 'delete_channels_self', description: 'Удаление созданных собой каналов', category: 'channels' as const, isBasic: false },
        { name: 'delete_channels_all', description: 'Удаление любых каналов', category: 'channels' as const, isBasic: false },
        { name: 'pin_channels', description: 'Закрепление/открепление каналов', category: 'channels' as const, isBasic: false },
        { name: 'close_channels_self', description: 'Установка режима "только чтение" для созданных собой каналов', category: 'channels' as const, isBasic: false },
        { name: 'close_channels_all', description: 'Установка режима "только чтение" для любых каналов', category: 'channels' as const, isBasic: false },
        { name: 'view_users_self', description: 'Просмотр своего профиля', category: 'users' as const, isBasic: true },
        { name: 'view_users_all', description: 'Просмотр профилей всех пользователей', category: 'users' as const, isBasic: false },
        { name: 'edit_users_self', description: 'Редактирование своего профиля, НЕ включая роль', category: 'users' as const, isBasic: true },
        { name: 'edit_users_all', description: 'Редактирование профилей всех пользователей, НЕ включая роль', category: 'users' as const, isBasic: false },
        { name: 'create_users', description: 'Создание новых пользователей', category: 'users' as const, isBasic: false },
        { name: 'delete_users', description: 'Удаление пользователей', category: 'users' as const, isBasic: false },
        { name: 'change_roles', description: 'Изменение ролей пользователей', category: 'roles' as const, isBasic: false },
        { name: 'create_roles', description: 'Создание новых ролей', category: 'roles' as const, isBasic: false },
        { name: 'edit_roles', description: 'Редактирование ролей', category: 'roles' as const, isBasic: false },
        { name: 'delete_roles', description: 'Удаление ролей', category: 'roles' as const, isBasic: false },
        { name: 'manage_permissions', description: 'Управление разрешениями ролей', category: 'roles' as const, isBasic: false },
        { name: 'admin_panel_access', description: 'Доступ к административной панели', category: 'admin' as const, isBasic: false }
      ];

      const createdPermissions = [];
      for (const perm of permissions) {
        const created = await db.createPermission(perm);
        createdPermissions.push(created);
      }
      console.log(`Created ${createdPermissions.length} permissions`);
    } else {
      console.log(`Found ${existingPermissions.length} existing permissions`);
    }

    // Check if roles already exist
    const existingRoles = await db.getAllRoles();
    if (existingRoles.length === 0) {
      const allPermissions = await db.getAllPermissions();
      const allPermissionIds = allPermissions.map(p => p.id);
      const basicPermissionIds = allPermissions.filter(p => p.isBasic).map(p => p.id);

      const roles = [
        {
          name: 'admin',
          description: 'Админ с полными правами',
          type: 'default' as const,
          permissions: allPermissionIds
        },
        {
          name: 'user',
          description: 'Пользователи',
          type: 'default' as const,
          permissions: basicPermissionIds
        },
        {
          name: 'blocked',
          description: 'Заблокированные пользователи',
          type: 'default' as const,
          permissions: []
        }
      ];

      const createdRoles = [];
      for (const role of roles) {
        const created = await db.createRole(role);
        createdRoles.push(created);
      }
      console.log(`Created ${createdRoles.length} roles`);
    } else {
      console.log(`Found ${existingRoles.length} existing roles`);
    }

    // Check if users already exist
    const existingUsers = await db.getAllUsers();
    if (existingUsers.length === 0) {
      const users = [
        {
          username: 'admin',
          role: 'admin',
          bio: 'Главный администратор системы'
        },
        {
          username: 'user',
          role: 'user',
          bio: ''
        }
      ];

      const createdUsers = [];
      for (const user of users) {
        const created = await db.createUser(user);
        createdUsers.push(created);
      }
      console.log(`Created ${createdUsers.length} users`);

      // Create welcome channel
      const adminUser = createdUsers.find(u => u.username === 'admin');
      if (adminUser) {
        const channel = await db.createChannel({
          name: 'Добро пожаловать',
          description: 'Приветственный канал для новых пользователей',
          isPinned: true,
          isReadOnly: false,
          createdBy: adminUser.id
        });
        console.log('Created welcome channel');

        // Create welcome messages
        const messages = [
          {
            channelId: channel.id,
            createdBy: adminUser.id,
            content: 'Приветствие от админа!',
            isPinned: true
          }
        ];

        const userUser = createdUsers.find(u => u.username === 'user');
        if (userUser) {
          messages.push({
            channelId: channel.id,
            createdBy: userUser.id,
            content: 'Приветствие от обычного пользователя!',
            isPinned: false
          });
        }

        for (const message of messages) {
          await db.createMessage(message);
        }
        console.log(`Created ${messages.length} welcome messages`);
      }
    } else {
      console.log(`Found ${existingUsers.length} existing users`);
    }

    console.log('✅ MongoDB initialization complete');
    await db.disconnect();
  } catch (error) {
    console.error('❌ MongoDB initialization error:', error);
    await db.disconnect();
    process.exit(1);
  }
}

initialize().catch(console.error);