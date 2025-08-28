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
    const savedToken = localStorage.getItem('authToken');
    if (savedToken) {
      try {
        apiService.setAuthToken(savedToken);
        // Проверяем актуальный статус пользователя на сервере
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
    localStorage.setItem('chatUser', JSON.stringify(updatedUser));
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