import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, AuthContextType } from '../types';
import { apiService } from '../services/api';
import { socketService } from '../services/socket';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Восстановление пользователя из localStorage при загрузке
  useEffect(() => {
    // Очищаем все остатки кэша профилей
    Object.keys(localStorage)
      .filter(key => key.startsWith('profile_'))
      .forEach(key => localStorage.removeItem(key));
      
    const savedToken = localStorage.getItem('authToken');
    if (savedToken) {
      try {
        apiService.setAuthToken(savedToken);
        // Принудительно запрашиваем свежие данные пользователя с сервера
        apiService.getCurrentUser().then(({ user: serverUser }) => {
          setUser(serverUser);
          socketService.connect();
        }).catch(() => {
          // Токен истек или недействителен
          apiService.clearAuth();
          setUser(null);
        });
      } catch (error) {
        console.error('Error loading saved token:', error);
        localStorage.removeItem('authToken');
      }
    }
  }, []);

  // WebSocket обработчик для обновления текущего пользователя
  useEffect(() => {
    const handleUserUpdated = (updatedUser: User) => {
      if (user && updatedUser.id === user.id) {
        console.log('AuthContext: Updating current user via WebSocket', updatedUser.username);
        setUser(updatedUser);
      }
    };
    
    if (user) {
      socketService.onUserUpdated(handleUserUpdated);
    }
  }, [user]);

  const telegramLogin = async (telegramData: any) => {
    try {
      const { user: serverUser, token } = await apiService.telegramLogin(telegramData);
      
      setUser(serverUser);
      apiService.setAuthToken(token);
      socketService.connect();
    } catch (error) {
      console.error('Telegram login failed:', error);
      throw error;
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const logout = () => {
    setUser(null);
    apiService.clearAuth();
    socketService.disconnect();
  };

  const isAuthenticated = user !== null;

  const value: AuthContextType = {
    user,
    logout,
    updateUser,
    isAuthenticated,
    telegramLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};