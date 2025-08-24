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
    const savedUser = localStorage.getItem('chatUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        // Проверяем актуальный статус пользователя на сервере
        apiService.getUser(user.id).then(({ user: serverUser }) => {
          if (serverUser.role === 'blocked') {
            // Пользователь заблокирован - выходим
            localStorage.removeItem('chatUser');
            setUser(null);
          } else {
            setUser(serverUser);
            apiService.setCurrentUser(serverUser.id);
            socketService.connect();
          }
        }).catch(() => {
          // Если сервер недоступен, используем сохраненные данные
          setUser(user);
          apiService.setCurrentUser(user.id);
          socketService.connect();
        });
      } catch (error) {
        console.error('Error loading saved user:', error);
        localStorage.removeItem('chatUser');
      }
    }
  }, []);

  const login = async (username: string) => {
    try {
      const { user: serverUser } = await apiService.login(username);
      
      // Проверяем, заблокирован ли пользователь
      if (serverUser.role === 'blocked') {
        throw new Error('Ваш аккаунт заблокирован. Обратитесь к администратору.');
      }
      
      setUser(serverUser);
      apiService.setCurrentUser(serverUser.id);
      localStorage.setItem('chatUser', JSON.stringify(serverUser));
      socketService.connect();
    } catch (error) {
      console.error('Login failed:', error);
      throw error; // Пробрасываем ошибку дальше, чтобы UI мог её обработать
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('chatUser', JSON.stringify(updatedUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('chatUser');
    socketService.disconnect();
  };

  const isAuthenticated = user !== null;

  const value: AuthContextType = {
    user,
    login,
    logout,
    updateUser,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};