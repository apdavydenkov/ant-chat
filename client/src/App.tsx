import React from 'react';
import { Layout, ConfigProvider, Alert } from 'antd';
import { AuthProvider } from './contexts/AuthContext';
import { ChatProvider, useChat } from './contexts/ChatContext';
import { ViewProvider, useView } from './contexts/ViewContext';
import ChatHeader from './components/ChatHeader';
import ChannelList from './components/ChannelList';
import ChatView from './components/ChatView';
import ProfileView from './components/ProfileView';
import AdminPanel from './components/AdminPanel';
import LoginModal from './components/LoginModal';
import ruRU from 'antd/locale/ru_RU';


const ChatApp: React.FC = () => {
  const { currentView } = useView();
  const { isServerConnected, connectionError, loginModalVisible, setLoginModalVisible } = useChat();

  const renderCurrentView = () => {
    switch (currentView) {
      case 'channels':
        return <ChannelList />;
      case 'chat':
        return <ChatView />;
      case 'profile':
        return <ProfileView />;
      case 'admin':
        return <AdminPanel />;
      default:
        return <ChannelList />;
    }
  };

  return (
    <Layout style={{ height: '100dvh', overflow: 'hidden' }}>
      <ChatHeader />
      {!isServerConnected && connectionError && (
        <Alert
          message="Офлайн режим"
          description={connectionError}
          type="warning"
          showIcon
          closable
          style={{ margin: '4px 8px', fontSize: '12px' }}
        />
      )}
      <div style={{ 
        height: !isServerConnected ? 'calc(100dvh - 48px - 40px)' : 'calc(100dvh - 48px)', 
        overflow: (currentView === 'channels' || currentView === 'chat') ? 'hidden' : 'auto' 
      }}>
        {renderCurrentView()}
      </div>
      <LoginModal 
        open={loginModalVisible} 
        onClose={() => setLoginModalVisible(false)} 
      />
    </Layout>
  );
};

function App() {
  return (
    <ConfigProvider locale={ruRU}>
      <AuthProvider>
        <ChatProvider>
          <ViewProvider>
            <ChatApp />
          </ViewProvider>
        </ChatProvider>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
