import React, { useEffect, useCallback } from 'react';
import { Modal, message, Spin } from 'antd';
import { useAuth } from '../contexts/AuthContext';

declare global {
  interface Window {
    Telegram?: any;
  }
}

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ open, onClose }) => {
  const { telegramLogin } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const handleTelegramAuth = useCallback(async (user: any) => {
    setLoading(true);
    try {
      await telegramLogin(user);
      onClose();
      message.success('Успешная авторизация через Telegram!');
    } catch (error) {
      console.error('Telegram auth error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ошибка авторизации';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [telegramLogin, onClose]);

  useEffect(() => {
    if (!open) return;

    const container = document.getElementById('telegram-login-container');
    if (container) {
      container.innerHTML = '';
    }

    (window as any).onTelegramAuth = handleTelegramAuth;

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', 'codenamesru_bot');
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-auth-url', `${window.location.origin}/auth/telegram`);
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.async = true;

    if (container) {
      container.appendChild(script);
    }

    return () => {
      delete (window as any).onTelegramAuth;
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [open, handleTelegramAuth]);

  return (
    <Modal
      title="Вход через Telegram"
      open={open}
      footer={null}
      onCancel={onClose}
      closable={true}
      width={400}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <p style={{ marginTop: '16px' }}>Обработка данных...</p>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ marginBottom: '20px' }}>Для входа в чат используйте Telegram:</p>
          <div id="telegram-login-container" style={{ display: 'flex', justifyContent: 'center' }}></div>
          <p style={{ marginTop: '16px', fontSize: '12px', color: '#666' }}>
            Нажимая кнопку, вы соглашаетесь на передачу данных из Telegram
          </p>
        </div>
      )}
    </Modal>
  );
};

export default LoginModal;