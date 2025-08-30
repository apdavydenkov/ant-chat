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

  const saveToHistory = () => {
    setPreviousView(currentView);
    setPreviousViewingUserId(viewingUserId);
  };

  const goToChat = () => {
    saveToHistory();
    setCurrentView('chat');
    localStorage.setItem('currentView', 'chat');
  };
  
  const goToChannels = () => {
    saveToHistory();
    setCurrentView('channels');
    localStorage.setItem('currentView', 'channels');
    setViewingUserId(null);
    localStorage.removeItem('viewingUserId');
  };
  
  const goToProfile = (userId?: string) => {
    const targetUserId = userId || null;
    console.log('ViewContext: goToProfile called for user', targetUserId);
    
    // ВСЕГДА сохраняем в историю для принудительного обновления
    saveToHistory();
    
    setCurrentView('profile');
    localStorage.setItem('currentView', 'profile');
    
    // Принудительно обновляем viewingUserId даже если он тот же
    setViewingUserId(null); // сначала очищаем
    setTimeout(() => {
      setViewingUserId(targetUserId); // потом устанавливаем
    }, 0);
    
    if (targetUserId) {
      localStorage.setItem('viewingUserId', targetUserId);
    } else {
      localStorage.removeItem('viewingUserId');
    }
  };

  const goToAdmin = () => {
    saveToHistory();
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