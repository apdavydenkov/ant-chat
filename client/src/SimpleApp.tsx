import React from 'react';
import { Layout, List, Typography, ConfigProvider, theme } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { SimpleChatProvider, useSimpleChat } from './contexts/SimpleChatContext';

const { Text } = Typography;

const TestContent: React.FC = () => {
  console.log('TestContent rendering...');
  const { channels, activeChannelId } = useSimpleChat();
  console.log('TestContent - channels:', channels);
  console.log('TestContent - activeChannelId:', activeChannelId);

  return (
    <ConfigProvider 
      locale={ruRU}
      theme={{
        algorithm: theme.defaultAlgorithm,
      }}
    >
      <Layout style={{ height: '100dvh', overflow: 'hidden' }}>
        <div style={{ padding: '16px' }}>
          <Text strong>Простое приложение чата</Text>
          <List
            size="small"
            dataSource={channels}
            style={{ marginTop: '16px' }}
            renderItem={(channel) => (
              <List.Item
                style={{
                  cursor: 'pointer',
                  padding: '8px 12px',
                }}
              >
                <Text strong={channel.isPinned}>{channel.name}</Text>
              </List.Item>
            )}
          />
        </div>
      </Layout>
    </ConfigProvider>
  );
};

const SimpleApp: React.FC = () => {
  console.log('SimpleApp rendering...');
  return (
    <SimpleChatProvider>
      <TestContent />
    </SimpleChatProvider>
  );
};

export default SimpleApp;