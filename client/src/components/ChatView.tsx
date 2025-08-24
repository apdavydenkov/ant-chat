import React from 'react';
import { Layout } from 'antd';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

const { Content } = Layout;

const ChatView: React.FC = () => {
  return (
    <Layout style={{ height: '100%' }}>
      <Content style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <MessageList />
        </div>
        <MessageInput />
      </Content>
    </Layout>
  );
};

export default ChatView;