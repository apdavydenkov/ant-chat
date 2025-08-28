ПРАВИЛА РАЗРАБОТКИ
==================

ЗАПРЕЩЕНО:
- ЗАПРЕЩЕНО Хардкодить порты в коде
- ЗАПРЕЩЕНО Запускать клиент/сервер в коде
- ЗАПРЕЩЕНО Изменять порты без обновления .env файлов
- ЗАПРЕЩЕНО Хардкодить ключи, токены, URLs в коде

ОБЯЗАТЕЛЬНО ДЕЛАТЬ:
- Все порты, ключи, URLs выносить в переменные окружения (.env)
- Использовать process.env для всех конфигурационных значений
- Обновлять .env файлы при изменении портов/URLs

ПОЛНАЯ ДОКУМЕНТАЦИЯ API И СИСТЕМА РАЗРЕШЕНИЙ
============================================

СПИСОК РАЗРЕШЕНИЙ (PERMISSIONS)
===============================

БАЗОВЫЕ ПРАВА (добавляются автоматически в РОЛЬ при ее создании):
- account_access (1)
- send_messages (2)
- edit_messages_self (3) 
- delete_messages_self (5)
- view_users_self (17)
- edit_users_self (19)

ПОЛНЫЙ СПИСОК РАЗРЕШЕНИЙ С КАТЕГОРИЯМИ:
-------------------------------------

SYSTEM:
1. account_access - Базовый доступ к системе (базовое право)

MESSAGES:
2. send_messages - Отправка сообщений в чаты (базовое право)
3. edit_messages_self - Редактирование своих сообщений (базовое право)
4. edit_messages_all - Редактирование любых сообщений
5. delete_messages_self - Удаление своих сообщений (базовое право)
6. delete_messages_all - Удаление любых сообщений
7. pin_messages - Закрепление/открепление сообщений

CHANNELS:
9. create_channels - Создание новых каналов
10. edit_channels_self - Редактирование созданных собой каналов
11. edit_channels_all - Редактирование любых каналов
12. delete_channels_self - Удаление созданных собой каналов
13. delete_channels_all - Удаление любых каналов
14. pin_channels - Закрепление/открепление каналов
15. close_channels_self - Установка режима "только чтение" для созданных собой каналов
16. close_channels_all - Установка режима "только чтение" для любых каналов

USERS:
17. view_users_self - Просмотр своего профиля (базовое право)
18. view_users_all - Просмотр профилей всех пользователей
19. edit_users_self - Редактирование своего профиля, НЕ включая роль (базовое право)
20. edit_users_all - Редактирование профилей всех пользователей, НЕ включая роль
21. create_users - Создание новых пользователей
22. delete_users - Удаление пользователей

ROLES:
23. change_roles - Изменение ролей пользователей
25. create_roles - Создание новых ролей
26. edit_roles - Редактирование ролей
27. delete_roles - Удаление ролей
28. manage_permissions - Управление разрешениями ролей

ADMIN:
29. admin_panel_access - Доступ к административной панели (НЕ ИСПОЛЬЗУЕТСЯ)

ДЕТАЛЬНАЯ ДОКУМЕНТАЦИЯ API ENDPOINTS
====================================

ПУБЛИЧНЫЕ ENDPOINTS (без проверки разрешений):
---------------------------------------------
- POST /api/auth/login - Вход в систему
- GET /api/auth/user/:id/public - Получение публичной информации о пользователе (имя, роль)
- GET /api/channels/ - Получение списка каналов
- GET /api/messages/channel/:channelId - Получение сообщений канала
- GET /api/roles/ - Получение списка ролей (ПУБЛИЧНЫЙ ДОСТУП)
- GET /api/roles/:id - Получение роли по ID (ПУБЛИЧНЫЙ ДОСТУП)
- GET /api/permissions/ - Получение списка разрешений (ПУБЛИЧНЫЙ ДОСТУП)

AUTH ENDPOINTS (/api/auth/)
---------------------------

POST /login
- Описание: Аутентификация пользователя по имени
- Разрешения: НЕ требует (публичный доступ)
- Параметры: { username: string }
- Ответ: { user: User }
- Примечания: После входа проверяется account_access

GET /user/:id/public
- Описание: Получение публичной информации о пользователе
- Разрешения: НЕ требует (публичный доступ)
- Параметры: id в URL
- Ответ: { user: { id: string, username: string, role: string } }
- Примечания: Возвращает только публичные данные без приватной информации

GET /user/:id
- Описание: Получение пользователя по ID
- Разрешения: view_users_self (свой профиль) ИЛИ view_users_all (чужой)
- Параметры: id в URL
- Ответ: { user: User }

GET /users
- Описание: Получение всех пользователей (административная функция)
- Разрешения: view_users_all
- Ответ: { users: User[] }

POST /users
- Описание: Создание нового пользователя
- Разрешения: create_users
- Параметры: { username: string, role?: string, bio?: string }
- Ответ: { user: User }

PUT /user/:id
- Описание: Обновление пользователя
- Разрешения: 
  - Свой профиль: edit_users_self (автоматически разрешено)
  - Чужой профиль: edit_users_all
- Параметры: Partial<User>
- Ответ: { user: User }

PUT /user/:id/role
- Описание: Изменение роли пользователя
- Разрешения: change_roles
- Параметры: { role: string }
- Ответ: { user: User }

DELETE /user/:id
- Описание: Удаление пользователя
- Разрешения: delete_users
- Ответ: { success: boolean }

CHANNELS ENDPOINTS (/api/channels/)
----------------------------------

GET /
- Описание: Получение всех каналов
- Разрешения: НЕ требует (публичный доступ)
- Ответ: { channels: Channel[] }

POST /
- Описание: Создание нового канала
- Разрешения: create_channels
- Параметры: { name: string, description?: string }
- Ответ: { channel: Channel }

PUT /:id
- Описание: Обновление канала
- Разрешения:
  - name, description: edit_channels_self (создатель) ИЛИ edit_channels_all
  - isPinned: pin_channels
  - isReadOnly: close_channels_self (создатель) ИЛИ close_channels_all
- Параметры: Partial<Channel>
- Ответ: { channel: Channel }

DELETE /:id
- Описание: Удаление канала
- Разрешения: delete_channels_self (создатель) ИЛИ delete_channels_all
- Ответ: { success: boolean }

MESSAGES ENDPOINTS (/api/messages/)
----------------------------------

GET /channel/:channelId
- Описание: Получение сообщений канала
- Разрешения: НЕ требует (публичный доступ)
- Параметры: channelId в URL
- Ответ: { messages: Message[] }

GET /
- Описание: Получение всех сообщений (административная функция)
- Разрешения: view_users_all
- Ответ: { messages: Message[] }

POST /
- Описание: Создание сообщения
- Разрешения: send_messages
- Параметры: { channelId: string, content: string }
- Ответ: { message: Message }

PUT /:id
- Описание: Обновление сообщения
- Разрешения:
  - content: edit_messages_self (автор) ИЛИ edit_messages_all
  - isPinned: pin_messages
- Параметры: Partial<Message>
- Ответ: { message: Message }

DELETE /:id
- Описание: Удаление сообщения
- Разрешения: delete_messages_self (автор) ИЛИ delete_messages_all
- Ответ: { success: boolean }

ROLES ENDPOINTS (/api/roles/)
-----------------------------

GET /
- Описание: Получение всех ролей
- Разрешения: НЕ ТРЕБУЕТ (ПУБЛИЧНЫЙ ДОСТУП)
- Ответ: { roles: Role[] }

GET /:id
- Описание: Получение роли по ID
- Разрешения: НЕ ТРЕБУЕТ (ПУБЛИЧНЫЙ ДОСТУП)
- Параметры: id в URL
- Ответ: { role: Role }

POST /
- Описание: Создание новой роли
- Разрешения: create_roles
- Параметры: { name: string, description?: string, permissions?: string[] }
- Ответ: { role: Role }

PUT /:id
- Описание: Обновление роли (включая разрешения)
- Разрешения: edit_roles
- Параметры: { name?: string, description?: string, permissions?: string[] }
- Ответ: { role: Role }

DELETE /:id
- Описание: Удаление роли (только custom роли)
- Разрешения: delete_roles
- Ответ: { success: boolean }

GET /user/:userId/permissions
- Описание: Получение разрешений пользователя
- Разрешения: view_users_self (свои) ИЛИ view_users_all (чужие)
- Параметры: userId в URL
- Ответ: { permissions: Permission[] }

GET /user/:userId/role
- Описание: Получение роли пользователя
- Разрешения: view_users_all
- Параметры: userId в URL
- Ответ: { role: Role }

PERMISSIONS ENDPOINTS (/api/permissions/)
----------------------------------------

GET /
- Описание: Получение всех разрешений
- Разрешения: НЕ ТРЕБУЕТ (ПУБЛИЧНЫЙ ДОСТУП)
- Ответ: { permissions: Permission[] }

POST /
- Описание: Создание нового разрешения
- Разрешения: manage_permissions
- Параметры: { name: string, description: string, category: string, isBasic?: boolean }
- Ответ: { permission: Permission }

PUT /:id
- Описание: Обновление разрешения
- Разрешения: manage_permissions
- Параметры: { name?: string, description?: string, category?: string, isBasic?: boolean }
- Ответ: { permission: Permission }

DELETE /:id
- Описание: Удаление разрешения
- Разрешения: manage_permissions
- Ответ: { success: boolean }

GET /check
- Описание: Проверка наличия разрешения у пользователя
- Разрешения: account_access
- Параметры: permission в query (?permission=send_messages)
- Ответ: { hasPermission: boolean }

КЛИЕНТСКИЙ API (client/src/services/api.ts)
==========================================

Класс ApiService предоставляет типизированные методы для всех API endpoints:

AUTHENTICATION:
- setCurrentUser(userId: string) - установка текущего пользователя
- login(username: string) - вход в систему
- getUser(id: string) - получение полного профиля пользователя (требует авторизации)
- getPublicUser(id: string) - получение публичной информации о пользователе (имя, роль)
- updateUser(id: string, updates: Partial<User>) - обновление пользователя

CHANNELS:
- getChannels() - получение каналов
- createChannel(name: string, description?: string) - создание канала
- updateChannel(id: string, updates: Partial<Channel>) - обновление канала
- deleteChannel(id: string) - удаление канала

MESSAGES:
- getMessages() - получение всех сообщений (admin)
- getMessagesByChannel(channelId: string) - сообщения канала
- createMessage(channelId: string, content: string) - создание сообщения
- updateMessage(id: string, updates: Partial<Message>) - обновление сообщения
- deleteMessage(id: string) - удаление сообщения

ADMIN OPERATIONS:
- getAllUsers() - все пользователи
- createUser(userData) - создание пользователя
- updateUserRole(userId: string, role: string) - смена роли
- deleteUser(id: string) - удаление пользователя

ROLES & PERMISSIONS:
- getRoles() - получение ролей
- createRole(roleData) - создание роли
- getUserPermissions(userId: string) - разрешения пользователя
- updateRole(roleId: string, updates) - обновление роли
- deleteRole(roleId: string) - удаление роли
- hasPermission(permission: PermissionName) - проверка разрешения
- getUserRole(userId: string) - роль пользователя
- getRoleById(roleId: string) - роль по ID
- getAllPermissions() - все разрешения
- createPermission(permissionData) - создание разрешения
- updatePermission(permissionId: string, updates) - обновление разрешения
- deletePermission(permissionId: string) - удаление разрешения

ЗАГОЛОВКИ И АУТЕНТИФИКАЦИЯ:
- Content-Type: application/json
- x-user-id: текущий пользователь (устанавливается через setCurrentUser)

ПРЕДЛАГАЕМЫЕ РОЛИ И ИХ РАЗРЕШЕНИЯ
================================

DEFAULT РОЛИ (type: "default", защищены от удаления):

1. ADMIN - Суперадминистратор (максимальная защита)
- Все разрешения (1-29)
- ЗАЩИТЫ: нельзя удалить роль, нельзя удалить разрешения у роли, нельзя сменить роль пользователю с admin

2. USER - Стандартные пользователи  
- Права согласно роли (создается с базовыми правами, но может быть изменена)
- БАЗОВЫЕ ПРАВА: account_access, send_messages, edit_messages_self, delete_messages_self, view_users_self, edit_users_self

3. BLOCKED - Заблокированные пользователи
- БЕЗ account_access (нет доступа к системе)

CUSTOM РОЛИ (type: "custom", могут удаляться):

4. MODERATOR - Модераторские права (пример кастомной роли)
- БАЗОВЫЕ ПРАВА + дополнительные:
- edit_messages_all (4), delete_messages_all (6), pin_messages (7)
- create_channels (9), edit_channels_all (11), pin_channels (14)
- close_channels_self (15), close_channels_all (16)
- view_users_all (18), edit_users_all (20)

5. READONLY - Только чтение (пример кастомной роли)
- account_access (1), view_users_self (17)

ПРИМЕЧАНИЯ ПО РЕАЛИЗАЦИИ
========================

1. ЛОГИКА ДОСТУПА:
   - POST /login НЕ требует разрешений (доступно всем)
   - После входа проверяется account_access - если нет, пользователь заблокирован
   - account_access обязателен для всех операций авторизованных пользователей

2. СИСТЕМА РАЗРЕШЕНИЙ:
   - Каждое разрешение в БД имеет поле is_basic (true/false) и category
   - При создании новой РОЛИ автоматически добавляются все разрешения с is_basic: true
   - Пользователи получают права ИСКЛЮЧИТЕЛЬНО через свою роль
   - Разрешения "all" переопределяют ограничения "self"

3. ПРОВЕРКИ ВЛАДЕНИЯ ("self" операции):
   - Для операций с "self" нужно проверять, что текущий пользователь является владельцем ресурса
   - edit_messages_self - только свои сообщения
   - edit_channels_self - только созданные собой каналы
   - edit_users_self - только свой профиль

4. СИСТЕМНЫЕ ТРЕБОВАНИЯ:
   - При отсутствии разрешения API возвращает 403 Forbidden
   - Базовая аутентификация (requireAuth) проверяет account_access
   - Default роли (admin, user, blocked) защищены от удаления
   - Все операции с ролями логируются в консоль для отладки

5. СТРУКТУРА БД ДЛЯ РАЗРЕШЕНИЙ:
   - id: string
   - name: string (уникальное имя разрешения)
   - description: string (описание разрешения)
   - category: string (категория: "system", "messages", "channels", "users", "roles", "admin")
   - is_basic: boolean (добавляется ли автоматически в новые РОЛИ)
   - created_at: date

6. СТРУКТУРА БД ДЛЯ РОЛЕЙ:
   - id: string
   - name: string (уникальное имя роли)
   - description: string (описание роли)
   - type: string ("default" или "custom")
   - permissions: string[] (массив ID разрешений)
   - created_at: date

7. ЗАЩИТЫ ДЛЯ ADMIN РОЛИ:
   - Нельзя удалить роль admin
   - Нельзя удалить разрешения у роли admin
   - Нельзя сменить роль пользователю с admin на другую
   - Нельзя редактировать type роли admin