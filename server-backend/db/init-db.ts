import { promises as fs } from 'fs';
import * as fsExtra from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'data');
const usersFile = path.join(dbPath, 'users.json');
const channelsFile = path.join(dbPath, 'channels.json');
const messagesFile = path.join(dbPath, 'messages.json');
const rolesFile = path.join(dbPath, 'roles.json');
const permissionsFile = path.join(dbPath, 'permissions.json');

async function writeData<T>(filePath: string, data: T[]): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function initialize() {
  await fsExtra.ensureDir(dbPath);

  if (!await fileExists(permissionsFile)) {
    const permissions = [
      { id: '1', name: 'account_access', description: 'Базовый доступ к системе', category: 'system', isBasic: true, createdAt: new Date() },
      { id: '2', name: 'send_messages', description: 'Отправка сообщений в чаты', category: 'messages', isBasic: true, createdAt: new Date() },
      { id: '3', name: 'edit_messages_self', description: 'Редактирование своих сообщений', category: 'messages', isBasic: true, createdAt: new Date() },
      { id: '4', name: 'edit_messages_all', description: 'Редактирование любых сообщений', category: 'messages', isBasic: false, createdAt: new Date() },
      { id: '5', name: 'delete_messages_self', description: 'Удаление своих сообщений', category: 'messages', isBasic: true, createdAt: new Date() },
      { id: '6', name: 'delete_messages_all', description: 'Удаление любых сообщений', category: 'messages', isBasic: false, createdAt: new Date() },
      { id: '7', name: 'pin_messages', description: 'Закрепление/открепление сообщений', category: 'messages', isBasic: false, createdAt: new Date() },
      { id: '8', name: 'create_channels', description: 'Создание новых каналов', category: 'channels', isBasic: false, createdAt: new Date() },
      { id: '10', name: 'edit_channels_self', description: 'Редактирование созданных собой каналов', category: 'channels', isBasic: false, createdAt: new Date() },
      { id: '11', name: 'edit_channels_all', description: 'Редактирование любых каналов', category: 'channels', isBasic: false, createdAt: new Date() },
      { id: '12', name: 'delete_channels_self', description: 'Удаление созданных собой каналов', category: 'channels', isBasic: false, createdAt: new Date() },
      { id: '13', name: 'delete_channels_all', description: 'Удаление любых каналов', category: 'channels', isBasic: false, createdAt: new Date() },
      { id: '14', name: 'pin_channels', description: 'Закрепление/открепление каналов', category: 'channels', isBasic: false, createdAt: new Date() },
      { id: '15', name: 'close_channels_self', description: 'Установка режима \"только чтение\" для созданных собой каналов', category: 'channels', isBasic: false, createdAt: new Date() },
      { id: '16', name: 'close_channels_all', description: 'Установка режима \"только чтение\" для любых каналов', category: 'channels', isBasic: false, createdAt: new Date() },
      { id: '17', name: 'view_users_self', description: 'Просмотр своего профиля', category: 'users', isBasic: true, createdAt: new Date() },
      { id: '18', name: 'view_users_all', description: 'Просмотр профилей всех пользователей', category: 'users', isBasic: false, createdAt: new Date() },
      { id: '19', name: 'edit_users_self', description: 'Редактирование своего профиля, НЕ включая роль', category: 'users', isBasic: true, createdAt: new Date() },
      { id: '20', name: 'edit_users_all', description: 'Редактирование профилей всех пользователей, НЕ включая роль', category: 'users', isBasic: false, createdAt: new Date() },
      { id: '21', name: 'create_users', description: 'Создание новых пользователей', category: 'users', isBasic: false, createdAt: new Date() },
      { id: '22', name: 'delete_users', description: 'Удаление пользователей', category: 'users', isBasic: false, createdAt: new Date() },
      { id: '23', name: 'change_roles', description: 'Изменение ролей пользователей', category: 'roles', isBasic: false, createdAt: new Date() },
      { id: '24', name: 'view_roles', description: 'Просмотр списка ролей', category: 'roles', isBasic: false, createdAt: new Date() },
      { id: '25', name: 'create_roles', description: 'Создание новых ролей', category: 'roles', isBasic: false, createdAt: new Date() },
      { id: '26', name: 'edit_roles', description: 'Редактирование ролей', category: 'roles', isBasic: false, createdAt: new Date() },
      { id: '27', name: 'delete_roles', description: 'Удаление ролей', category: 'roles', isBasic: false, createdAt: new Date() },
      { id: '28', name: 'manage_permissions', description: 'Управление разрешениями ролей', category: 'roles', isBasic: false, createdAt: new Date() },
      { id: '29', name: 'admin_panel_access', description: 'Доступ к административной панели', category: 'admin', isBasic: false, createdAt: new Date() }
    ];
    await writeData(permissionsFile, permissions);
    console.log('Permissions initialized');
  }

  if (!await fileExists(rolesFile)) {
    const permissions = JSON.parse(await fs.readFile(permissionsFile, 'utf-8'));
    const allPermissions = permissions.map((p: any) => p.id);
    const basicPermissions = permissions.filter((p: any) => p.isBasic).map((p: any) => p.id);
    const roles = [
      { id: 'admin-role', name: 'admin', description: 'Админ с полными правами', type: 'default', permissions: allPermissions, createdAt: new Date() },
      { id: 'user-role', name: 'user', description: 'Пользователи', type: 'default', permissions: basicPermissions, createdAt: new Date() },
      { id: 'blocked-role', name: 'blocked', description: 'Заблокированные пользователи', type: 'custome', permissions: [], createdAt: new Date() }
    ];
    await writeData(rolesFile, roles);
    console.log('Roles initialized');
  }

  if (!await fileExists(usersFile)) {
    const adminId = uuidv4();
    const userId = uuidv4();
    const users = [
      { id: adminId, username: 'admin', role: 'admin', bio: 'Главный администратор системы', joinedAt: new Date(), lastActive: new Date() },
      { id: userId, username: 'user', role: 'user', bio: '', joinedAt: new Date(), lastActive: new Date() }
    ];
    await writeData(usersFile, users);
    console.log('Users initialized');
  }

  if (!await fileExists(channelsFile)) {
    const users = JSON.parse(await fs.readFile(usersFile, 'utf-8'));
    const adminId = users.find((u: any) => u.username === 'admin').id;
    const channels = [
      { id: uuidv4(), name: 'Добро пожаловать', isPinned: true, createdBy: adminId, createdAt: new Date(), description: 'Приветственный канал для новых пользователей', isReadOnly: false }
    ];
    await writeData(channelsFile, channels);
    console.log('Channels initialized');
  }

  if (!await fileExists(messagesFile)) {
    const users = JSON.parse(await fs.readFile(usersFile, 'utf-8'));
    const channels = JSON.parse(await fs.readFile(channelsFile, 'utf-8'));
    const adminId = users.find((u: any) => u.username === 'admin').id;
    const userId = users.find((u: any) => u.username === 'user').id;
    const channelId = channels[0].id;
    const messages = [
      { id: uuidv4(), channelId, createdBy: adminId, content: 'Приветствие от админа!', createdAt: new Date(), isPinned: true },
      { id: uuidv4(), channelId, createdBy: userId, content: 'Приветствие от обычного пользователя!', createdAt: new Date(), isPinned: false }
    ];
    await writeData(messagesFile, messages);
    console.log('Messages initialized');
  }

  console.log('Initialization complete');
}

initialize().catch(console.error);