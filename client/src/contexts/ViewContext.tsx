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

  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<ViewType[]>(['channels']);

  const goToChat = () => {
    setNavigationHistory(prev => [...prev, 'chat']);
    setCurrentView('chat');
    localStorage.setItem('currentView', 'chat');
  };
  
  const goToChannels = () => {
    setNavigationHistory(prev => [...prev, 'channels']);
    setCurrentView('channels');
    localStorage.setItem('currentView', 'channels');
    setViewingUserId(null);
  };
  
  const goToProfile = (userId?: string) => {
    setNavigationHistory(prev => [...prev, 'profile']);
    setCurrentView('profile');
    localStorage.setItem('currentView', 'profile');
    setViewingUserId(userId || null);
  };

  const goToAdmin = () => {
    setNavigationHistory(prev => [...prev, 'admin']);
    setCurrentView('admin');
    localStorage.setItem('currentView', 'admin');
    setViewingUserId(null);
  };

  const goBack = () => {
    if (navigationHistory.length > 1) {
      const newHistory = [...navigationHistory];
      newHistory.pop(); // Remove current view
      const previousView = newHistory[newHistory.length - 1];
      setNavigationHistory(newHistory);
      setCurrentView(previousView);
      localStorage.setItem('currentView', previousView);
      if (previousView !== 'profile') {
        setViewingUserId(null);
      }
    } else {
      // Fallback to channels if no history
      goToChannels();
    }
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