# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Type
Node.js + Vite applications with full responsive design.

## Development Commands
```bash
npm install           # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run linter
npm run lint:fix     # Fix linting issues
```

## Architecture Principles
- **Simple solutions first** - Always choose the most straightforward approach
- **No over-engineering** - Avoid complex patterns when simple ones work
- **Responsive by default** - Mobile-first design, works on all screen sizes
- **Vite-powered** - Fast development with HMR and optimized builds

## Code Style
- Use modern JavaScript/TypeScript features
- Prefer functional components
- Keep components small and focused
- Use CSS modules or styled-components for styling
- Implement responsive breakpoints: mobile (320px+), tablet (768px+), desktop (1024px+)

## Responsive Design Requirements
- All layouts must work on mobile, tablet, and desktop
- Use flexbox/grid for layouts
- Implement touch-friendly interactions
- Optimize images for different screen densities
- Test on multiple viewport sizes

## Simple Solutions Policy
- Choose vanilla solutions over complex libraries when possible
- Prefer CSS over JavaScript for animations
- Use standard HTML elements before custom components
- Implement features with minimal dependencies

# СТРУКТУРА ПРОЕКТА И АНАЛИЗ КЭШИРОВАНИЯ/СОСТОЯНИЯ

## Текущая структура файлов

### Клиентская часть (client/)
```
client/
├── src/
│   ├── components/               # React компоненты
│   │   ├── AdminPanel.tsx       # Панель администратора
│   │   ├── AvatarSelector.tsx   # Селектор аватаров
│   │   ├── ChannelList.tsx      # Список каналов
│   │   ├── ChatHeader.tsx       # Заголовок чата
│   │   ├── ChatView.tsx         # Основной вид чата
│   │   ├── LoginModal.tsx       # Модал входа
│   │   ├── MessageInput.tsx     # Ввод сообщений
│   │   ├── MessageList.tsx      # Список сообщений
│   │   └── ProfileView.tsx      # Просмотр профиля
│   ├── contexts/                # React контексты
│   │   ├── AuthContext.tsx      # Контекст аутентификации
│   │   ├── ChatContext.tsx      # Контекст чата (сообщения, каналы, пользователи)
│   │   └── ViewContext.tsx      # Контекст навигации/видов
│   ├── services/                # Сервисы
│   │   ├── api.ts              # API клиент с кэшированием разрешений
│   │   └── socket.ts           # WebSocket клиент
│   ├── types/                   # TypeScript типы
│   │   └── index.ts            # Определения типов
│   ├── utils/                   # Утилиты
│   │   ├── avatar.ts           # Генерация аватаров
│   │   └── logger.ts           # Логирование
│   ├── App.tsx                 # Корневой компонент
│   ├── main.tsx                # Точка входа
│   └── index.css               # Глобальные стили
├── package.json
├── vite.config.ts
└── .env                        # Переменные окружения
```

### Серверная часть (server/)
```
server/
├── db/                         # База данных
│   ├── init-mongodb.ts        # Инициализация MongoDB
│   └── mongodb.ts             # Подключение к MongoDB
├── middleware/                 # Middleware
│   ├── auth.ts               # Аутентификация
│   └── rateLimit.ts          # Ограничение запросов
├── routes/                     # API маршруты
│   ├── auth.ts               # Аутентификация пользователей
│   ├── channels.ts           # Операции с каналами
│   ├── messages.ts           # Операции с сообщениями
│   ├── permissions.ts        # Управление разрешениями
│   └── roles.ts              # Управление ролями
├── utils/                      # Серверные утилиты
│   └── jwt.ts                # JWT токены
├── index.ts                   # Главный серверный файл
├── package.json
└── .env                       # Серверные переменные окружения
```

## Проблемы текущей структуры кэширования и состояния

### 1. МНОЖЕСТВЕННЫЕ СИСТЕМЫ КЭШИРОВАНИЯ (без координации)

#### ApiService (client/src/services/api.ts)
- **Кэш разрешений**: `permissionsCache: Record<string, boolean>` (в памяти)
- **Логика**: Кэширует результаты проверки разрешений для оптимизации
- **Очистка**: При `clearAuth()` и `updateUserRole()`
- **Проблема**: Изолирован от других систем кэширования

#### ChatContext (client/src/contexts/ChatContext.tsx)
- **Кэш сообщений**: `chat_messages_${channelId}` (localStorage)
- **Кэш пользователей**: `chat_users` (localStorage)
- **TTL**: 24 часа (CACHE_TTL = 24 * 60 * 60 * 1000)
- **Функции**: `loadMessagesFromCache()`, `saveMessagesToCache()`, `loadUsersFromCache()`, `saveUsersToCache()`
- **Проблема**: Дублирует данные пользователей с другими системами

#### ProfileView (client/src/components/ProfileView.tsx)
- **Кэш профилей**: `profiles_cache` (localStorage)
- **Кэш ролей**: `roles_cache` (localStorage)  
- **Кэш разрешений**: `permissions_cache` (localStorage)
- **Без TTL**: Кэш живет до явной очистки
- **Проблема**: Три отдельные системы кэширования в одном компоненте

#### AuthContext (client/src/contexts/AuthContext.tsx)
- **Антикэш**: Очищает кэш профилей при загрузке (`profile_*` ключи)
- **Цель**: Принуждение к свежим данным с сервера
- **Проблема**: Конфликтует с кэшированием в ProfileView

### 2. ДУБЛИРОВАНИЕ И РАССИНХРОНИЗАЦИЯ ДАННЫХ

#### Пользователи хранятся в 4 местах:
1. **AuthContext.user** - текущий пользователь
2. **ChatContext.users** - пользователи в сообщениях (Record<string, User>)
3. **ProfileView.viewingUser** - просматриваемый профиль
4. **localStorage.profiles_cache** - кэш профилей

#### Роли дублируются:
1. **ProfileView.roles** - локальное состояние
2. **localStorage.roles_cache** - кэш ролей
3. Потенциально в ChatContext для отображения

#### Разрешения в трех местах:
1. **ApiService.permissionsCache** - проверки разрешений (память)
2. **ProfileView.permissions** - для отображения в UI
3. **localStorage.permissions_cache** - долговременный кэш

### 3. НЕКОНСИСТЕНТНЫЕ WEBSOCKET ОБНОВЛЕНИЯ

#### Обработчики user-updated в трех местах:
1. **AuthContext** - обновляет только текущего пользователя
2. **ChatContext** - обновляет пользователей в кэше сообщений + profiles_cache
3. **ProfileView** - обновляет просматриваемого пользователя + profiles_cache

#### Проблемы:
- Одно WebSocket событие обрабатывается трижды
- Риск рассинхронизации между кэшами
- Избыточные операции с localStorage

### 4. НЕЭФФЕКТИВНЫЕ ПАТТЕРНЫ

#### Множественные localStorage операции:
```javascript
// В ChatContext
localStorage.setItem(getMessagesCacheKey(channelId), JSON.stringify(data));
localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(data));

// В ProfileView  
localStorage.setItem('profiles_cache', JSON.stringify(data));
localStorage.setItem('roles_cache', JSON.stringify(rolesData));
localStorage.setItem('permissions_cache', JSON.stringify(permissionsData));

// В ViewContext
localStorage.setItem('activeChannelId', channelId);
localStorage.setItem('currentView', 'profile');
```

#### Отсутствие инвалидации кэша:
- Кэш с TTL но без smart инвалидации при изменениях
- При обновлении пользователя кэш может стать неактуальным
- Нет механизма инвалидации связанных данных

## ПРЕДЛАГАЕМОЕ РЕШЕНИЕ

### 1. Создать единую систему кэширования

#### CacheService (client/src/services/cache.ts)
```typescript
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheService {
  private memoryCache = new Map<string, CacheItem<any>>();
  
  // Основные методы
  set<T>(key: string, data: T, ttl = 24 * 60 * 60 * 1000): void
  get<T>(key: string): T | null
  invalidate(key: string): void
  invalidatePattern(pattern: RegExp): void
  
  // Специфичные методы для типов данных
  setUser(userId: string, user: User): void
  getUser(userId: string): User | null
  setChannel(channelId: string, channel: Channel): void
  getChannel(channelId: string): Channel | null
  
  // Инвалидация связанных данных
  invalidateUserRelated(userId: string): void
  invalidateChannelRelated(channelId: string): void
}
```

#### Ключи кэша (стандартизированные):
```
users:{userId}                    # Профиль пользователя
channels:{channelId}              # Данные канала
messages:{channelId}              # Сообщения канала
roles:list                        # Список ролей
permissions:list                  # Список разрешений
permissions:user:{userId}         # Разрешения пользователя
ui:activeChannel                  # UI состояние
ui:currentView                    # UI состояние
```

### 2. Централизованное управление данными

#### DataStore (client/src/stores/DataStore.ts)
```typescript
class DataStore {
  private users = new Map<string, User>();
  private channels = new Map<string, Channel>();
  private messages = new Map<string, Message[]>();
  private roles: Role[] = [];
  private permissions: Permission[] = [];
  
  // Подписки на изменения
  private subscribers = new Map<string, Set<Function>>();
  
  // Методы управления данными
  setUser(user: User): void
  getUser(userId: string): User | null
  updateUser(userId: string, updates: Partial<User>): void
  
  // Подписки
  subscribe(key: string, callback: Function): () => void
  emit(key: string, data: any): void
  
  // WebSocket интеграция
  handleUserUpdated(user: User): void
  handleChannelUpdated(channel: Channel): void
  handleMessageReceived(message: Message): void
}
```

### 3. Рефакторинг контекстов

#### Новый AuthContext (только аутентификация)
```typescript
interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  telegramLogin: (data: any) => Promise<void>;
  logout: () => void;
}
```

#### Новый DataContext (управление данными)
```typescript
interface DataContextType {
  dataStore: DataStore;
  cacheService: CacheService;
  
  // Загрузка данных
  loadUser: (userId: string) => Promise<User>;
  loadChannels: () => Promise<Channel[]>;
  loadMessages: (channelId: string) => Promise<Message[]>;
  
  // Подписки на изменения
  useUser: (userId: string) => User | null;
  useChannels: () => Channel[];
  useMessages: (channelId: string) => Message[];
}
```

#### Упрощенный ChatContext (только UI состояние)
```typescript
interface ChatContextType {
  activeChannelId: string | null;
  isServerConnected: boolean;
  connectionError: string | null;
  
  setActiveChannel: (channelId: string) => void;
  
  // Операции (используют DataContext внутри)
  createChannel: (name: string) => Promise<void>;
  addMessage: (channelId: string, content: string) => Promise<void>;
}
```

### 4. Специализированные хуки

#### client/src/hooks/useUser.ts
```typescript
export const useUser = (userId: string | null): User | null => {
  const { dataStore } = useContext(DataContext);
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    if (!userId) return;
    
    const unsubscribe = dataStore.subscribe(`user:${userId}`, setUser);
    return unsubscribe;
  }, [userId, dataStore]);
  
  return user;
};
```

#### client/src/hooks/useChannels.ts
```typescript
export const useChannels = (): Channel[] => {
  const { dataStore } = useContext(DataContext);
  const [channels, setChannels] = useState<Channel[]>([]);
  
  useEffect(() => {
    const unsubscribe = dataStore.subscribe('channels', setChannels);
    return unsubscribe;
  }, [dataStore]);
  
  return channels;
};
```

### 5. Единая система инвалидации

#### WebSocket обработчики (один раз)
```typescript
// В DataStore
handleUserUpdated(user: User): void {
  this.setUser(user);
  this.cacheService.setUser(user.id, user);
  this.cacheService.invalidatePattern(/^permissions:user:/);
  this.emit(`user:${user.id}`, user);
}

handleChannelUpdated(channel: Channel): void {
  this.setChannel(channel);
  this.cacheService.setChannel(channel.id, channel);
  this.emit(`channel:${channel.id}`, channel);
  this.emit('channels', this.getAllChannels());
}
```

## Преимущества предлагаемого решения

### 1. **Единый источник истины**
- Все данные управляются через DataStore
- Нет дублирования и рассинхронизации
- Предсказуемые обновления состояния

### 2. **Эффективное кэширование**
- Единый CacheService с умной инвалидацией
- Стандартизированные ключи кэша
- Автоматическая очистка связанных данных

### 3. **Упрощенная архитектура**
- Разделение ответственности между контекстами
- Специализированные хуки для каждого типа данных
- Меньше сложности в компонентах

### 4. **Лучшая производительность**
- Меньше операций с localStorage
- Умная инвалидация кэша
- Подписки только на нужные данные

### 5. **Легкость отладки**
- Централизованная точка управления данными
- Четкий flow обновлений
- Логирование всех изменений в одном месте