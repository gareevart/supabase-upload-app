
import React, { useState } from 'react';
import { Button, TextInput, Modal, Text, Flex } from '@gravity-ui/uikit';

interface ImageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddImage: (url: string, alt: string) => void;
}

const ImageDialog: React.FC<ImageDialogProps> = ({
  isOpen,
  onClose,
  onAddImage
}) => {
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");

  const handleAddImage = () => {
    if (!imageUrl.trim()) return;
    onAddImage(imageUrl, imageAlt);
    setImageUrl("");
    setImageAlt("");
    onClose();
  };

  const handleClose = () => {
    setImageUrl("");
    setImageAlt("");
    onClose();
  };
  return (
    <Modal open={isOpen} onClose={handleClose}>
      <div style={{ padding: '24px', minWidth: '400px' }}>
        <Text variant="header-2" style={{ marginBottom: '24px' }}>
          Добавить изображение
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <div>
            <Text variant="body-1" style={{ marginBottom: '8px' }}>URL</Text>
            <TextInput
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://"
            />
          </div>
          <div>
            <Text variant="body-1" style={{ marginBottom: '8px' }}>Описание</Text>
            <TextInput
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              placeholder="Описание изображения"
            />
          </div>
        </div>
        <Flex direction="row" justifyContent="flex-end" gap={2}>
          <Button view="outlined" onClick={handleClose}>
            Отмена
          </Button>
          <Button view="action" onClick={handleAddImage}>Добавить</Button>
        </Flex>
      </div>
    </Modal>
  );
};

export default ImageDialog;
