import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { ViewType } from '../types';

interface ViewContextType {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  goToChat: () => void;
  goToChannels: () => void;
  goToProfile: (userId?: string) => void;
  goToAdmin: () => void;
  goBack: () => void;
  viewingUserId: string | null;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export const useView = () => {
  const context = useContext(ViewContext);
  if (context === undefined) {
    throw new Error('useView must be used within a ViewProvider');
  }
  return context;
};

interface ViewProviderProps {
  children: ReactNode;
}

export const ViewProvider: React.FC<ViewProviderProps> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    const saved = localStorage.getItem('currentView');
    return (saved as ViewType) || 'channels';
  });

  const [viewingUserId, setViewingUserId] = useState<string | null>(() => {
    return localStorage.getItem('viewingUserId') || null;
  });

  // Простая история - только предыдущий экран
  const [previousView, setPreviousView] = useState<ViewType>('channels');
  const [previousViewingUserId, setPreviousViewingUserId] = useState<string | null>(null);

  const saveToHistory = (view: ViewType, userId: string | null) => {
    setPreviousView(currentView);
    setPreviousViewingUserId(viewingUserId);
  };

  const goToChat = () => {
    saveToHistory('chat', null);
    setCurrentView('chat');
    localStorage.setItem('currentView', 'chat');
  };
  
  const goToChannels = () => {
    saveToHistory('channels', null);
    setCurrentView('channels');
    localStorage.setItem('currentView', 'channels');
    setViewingUserId(null);
    localStorage.removeItem('viewingUserId');
  };
  
  const goToProfile = (userId?: string) => {
    // Не сохраняем в историю если переходим на тот же профиль
    const targetUserId = userId || null;
    if (!(currentView === 'profile' && viewingUserId === targetUserId)) {
      saveToHistory('profile', targetUserId);
    }
    
    setCurrentView('profile');
    localStorage.setItem('currentView', 'profile');
    setViewingUserId(targetUserId);
    if (targetUserId) {
      localStorage.setItem('viewingUserId', targetUserId);
    } else {
      localStorage.removeItem('viewingUserId');
    }
  };

  const goToAdmin = () => {
    saveToHistory('admin', null);
    setCurrentView('admin');
    localStorage.setItem('currentView', 'admin');
    setViewingUserId(null);
    localStorage.removeItem('viewingUserId');
  };

  const goBack = () => {
    // Просто возвращаемся к предыдущему экрану
    setCurrentView(previousView);
    localStorage.setItem('currentView', previousView);
    
    if (previousView === 'profile') {
      setViewingUserId(previousViewingUserId);
      if (previousViewingUserId) {
        localStorage.setItem('viewingUserId', previousViewingUserId);
      } else {
        localStorage.removeItem('viewingUserId');
      }
    } else {
      setViewingUserId(null);
      localStorage.removeItem('viewingUserId');
    }
    
    // Сбрасываем историю
    setPreviousView('channels');
    setPreviousViewingUserId(null);
  };

  const value: ViewContextType = {
    currentView,
    setCurrentView,
    goToChat,
    goToChannels,
    goToProfile,
    goToAdmin,
    goBack,
    viewingUserId,
  };

  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
};