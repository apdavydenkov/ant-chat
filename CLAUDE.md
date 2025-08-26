СИСТЕМА РАЗРЕШЕНИЙ И МАППИНГ API ТОЧЕК
================================================

СПИСОК РАЗРЕШЕНИЙ (PERMISSIONS)
===============================

БАЗОВЫЕ ПРАВА (добавляются автоматически в РОЛЬ при ее создании для удобства):
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
24. view_roles - Просмотр списка ролей
25. create_roles - Создание новых ролей
26. edit_roles - Редактирование ролей
27. delete_roles - Удаление ролей
28. manage_permissions - Управление разрешениями ролей

ADMIN:
29. admin_panel_access - Доступ к административной панели

МАППИНГ API ТОЧЕК И РАЗРЕШЕНИЙ
==============================

AUTH ENDPOINTS (/api/auth/)
---------------------------
POST /login
- НЕ требует разрешений (доступно всем для входа)
- После входа проверяется наличие account_access - если нет, пользователь заблокирован

GET /user/:id
- Требует: view_users_self (если свой профиль) ИЛИ view_users_all (если чужой)

GET /users
- Требует: view_users_all

POST /users
- Требует: create_users

PUT /user/:id
- Для своего профиля: edit_users_self
- Для чужого профиля: edit_users_all
- Для изменения роли: change_roles

DELETE /user/:id
- Требует: delete_users

CHANNELS ENDPOINTS (/api/channels/)
----------------------------------
GET /
- НЕ требует разрешений (публичный доступ)

POST /
- Требует: create_channels

PUT /:id
- Для основных полей (name, description): edit_channels_self (если создатель) ИЛИ edit_channels_all
- Для isPinned: pin_channels
- Для isReadOnly: close_channels_self (если создатель) ИЛИ close_channels_all

DELETE /:id
- Требует: delete_channels_self (если создатель) ИЛИ delete_channels_all

MESSAGES ENDPOINTS (/api/messages/)
----------------------------------
GET /channel/:channelId
- НЕ требует разрешений (публичный доступ к сообщениям)

GET /
- Требует: view_users_all (административная функция)

POST /
- Требует: send_messages

PUT /:id
- Для content: edit_messages_self (если автор) ИЛИ edit_messages_all
- Для isPinned: pin_messages

DELETE /:id
- Требует: delete_messages_self (если автор) ИЛИ delete_messages_all

ROLES ENDPOINTS (/api/roles/)
-----------------------------
GET /
- Требует: view_roles

GET /:id
- Требует: view_roles

POST /
- Требует: create_roles

PUT /:id
- Требует: edit_roles (включает редактирование описания роли И ее разрешений)

DELETE /:id
- Требует: delete_roles (только для custom ролей, default роли защищены)

GET /user/:userId/permissions
- Для своих разрешений: view_users_self
- Для чужих разрешений: view_users_all

GET /user/:userId/role
- Требует: view_users_all

PERMISSIONS ENDPOINTS (/api/permissions/)
----------------------------------------
GET /
- Требует: view_roles (просмотр списка всех разрешений)

POST /
- Требует: manage_permissions (создание нового разрешения)

PUT /:id
- Требует: manage_permissions (редактирование ОПИСАНИЯ разрешения, НЕ назначения ролям)

DELETE /:id
- Требует: manage_permissions (удаление разрешения)

GET /check
- Требует: account_access (проверка наличия определенного разрешения у пользователя)

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