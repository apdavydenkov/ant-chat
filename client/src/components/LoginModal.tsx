import React from 'react';
import { Input, Modal, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ open, onClose }) => {
  const { login } = useAuth();
  const [username, setUsername] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async () => {
    if (username.trim() && username.trim().length >= 2) {
      setLoading(true);
      try {
        await login(username.trim());
        setUsername('');
        onClose();
      } catch (error) {
        console.error('Login error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Ошибка входа';
        message.error(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancel = () => {
    setUsername('');
    onClose();
  };

  return (
    <Modal
      title="Войти в чат"
      open={open}
      onOk={handleLogin}
      onCancel={handleCancel}
      okText="Войти"
      cancelText="Отмена"
      confirmLoading={loading}
      closable={false}
    >
      <Input
        prefix={<UserOutlined />}
        placeholder="Введите имя пользователя"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onPressEnter={handleLogin}
      />
      <div style={{ textAlign: 'center', color: '#666', fontSize: '12px', marginTop: '16px' }}>
        <p>Для администратора используйте: <strong>admin</strong></p>
        <p>Для обычного пользователя: любое другое имя</p>
      </div>
    </Modal>
  );
};

export default LoginModal;