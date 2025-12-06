
import React, { useState } from 'react';
import { Button, TextInput, Modal, Text, Flex } from '@gravity-ui/uikit';

interface LinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLink: (url: string, text: string) => void;
  initialText?: string;
}

const LinkDialog: React.FC<LinkDialogProps> = ({
  isOpen,
  onClose,
  onAddLink,
  initialText = ""
}) => {
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState(initialText);

  const handleAddLink = () => {
    if (!linkUrl.trim()) return;
    onAddLink(linkUrl, linkText);
    setLinkUrl("");
    setLinkText("");
    onClose();
  };

  const handleClose = () => {
    setLinkUrl("");
    setLinkText("");
    onClose();
  };
  return (
    <Modal open={isOpen} onClose={handleClose}>
      <div style={{ padding: '24px', minWidth: '400px' }}>
        <Text variant="header-2" style={{ marginBottom: '24px' }}>
          Добавить ссылку
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <div>
            <Text variant="body-1" style={{ marginBottom: '8px' }}>Текст</Text>
            <TextInput
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              placeholder="Текст ссылки"
            />
          </div>
          <div>
            <Text variant="body-1" style={{ marginBottom: '8px' }}>URL</Text>
            <TextInput
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://"
            />
          </div>
        </div>
        <Flex direction="row" justifyContent="flex-end" gap={2}>
          <Button view="outlined" onClick={handleClose}>
            Отмена
          </Button>
          <Button view="action" onClick={handleAddLink}>Добавить</Button>
        </Flex>
      </div>
    </Modal>
  );
};

export default LinkDialog;
