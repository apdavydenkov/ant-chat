import React, { useState, useEffect } from 'react';
import { Modal, Grid, Typography, Button } from 'antd';
import { generateAvatarOptions, createAvatarConfig } from '../utils/avatar';

const { Text } = Typography;
const { useBreakpoint } = Grid;

interface AvatarSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (avatarConfig: string) => void;
  userId: string;
}

const AvatarSelector: React.FC<AvatarSelectorProps> = ({ visible, onClose, onSelect, userId }) => {
  const [avatarOptions, setAvatarOptions] = useState<Array<{ style: string, label: string, dataUri: string, seed: string }>>([]);
  const [selectedOption, setSelectedOption] = useState<{ style: string, seed: string } | null>(null);
  const screens = useBreakpoint();

  useEffect(() => {
    if (visible && userId) {
      const options = generateAvatarOptions(userId);
      setAvatarOptions(options);
      setSelectedOption(null);
    }
  }, [visible, userId]);

  const handleSelect = () => {
    if (selectedOption) {
      const config = createAvatarConfig(selectedOption.style, selectedOption.seed);
      onSelect(config);
      onClose();
    }
  };

  const handleAvatarClick = (option: { style: string, seed: string, dataUri: string }) => {
    setSelectedOption({ style: option.style, seed: option.seed });
  };

  return (
    <Modal
      title="Выберите аватар"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Отмена
        </Button>,
        <Button key="select" type="primary" onClick={handleSelect} disabled={!selectedOption}>
          Выбрать
        </Button>,
      ]}
      width={screens.lg ? 800 : '90%'}
      style={{ top: screens.sm ? 20 : 0 }}
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          Выберите один из 9 стилей аватара. Каждый стиль генерирует уникальное изображение на основе вашего ID.
        </Text>
      </div>
      
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: screens.md ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
          gap: 16,
          maxHeight: 400,
          overflowY: 'auto',
        }}
      >
        {avatarOptions.map((option) => (
          <div
            key={option.style}
            onClick={() => handleAvatarClick(option)}
            style={{
              border: selectedOption?.style === option.style ? '3px solid #1890ff' : '2px solid #d9d9d9',
              borderRadius: 8,
              padding: 12,
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.2s',
              backgroundColor: selectedOption?.style === option.style ? '#f0f8ff' : 'white',
            }}
          >
            <div style={{ marginBottom: 8 }}>
              <img
                src={option.dataUri}
                alt={option.label}
                style={{ 
                  width: 64, 
                  height: 64,
                  borderRadius: '50%',
                  objectFit: 'cover'
                }} 
              />
            </div>
            <Text strong>{option.label}</Text>
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default AvatarSelector;