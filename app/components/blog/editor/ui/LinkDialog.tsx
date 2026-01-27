import React from 'react';
import { Button, Icon, Modal, Text, TextInput } from '@gravity-ui/uikit';
import { Xmark } from '@gravity-ui/icons';
import { Flex } from '@gravity-ui/uikit';

type LinkDialogProps = {
  open: boolean;
  onClose: () => void;
  linkUrl: string;
  onLinkUrlChange: (value: string) => void;
  linkText: string;
  onLinkTextChange: (value: string) => void;
  onSubmit: () => void;
};

export const LinkDialog = ({
  open,
  onClose,
  linkUrl,
  onLinkUrlChange,
  linkText,
  onLinkTextChange,
  onSubmit,
}: LinkDialogProps) => (
  <Modal open={open} onClose={onClose}>
    <div className="modal-content">
      <div className="top-modal">
        <Text variant="subheader-3">Add Link</Text>
        <Button size="xl" view="flat" onClick={onClose}>
          <Icon data={Xmark} size={18} />
        </Button>
      </div>

      <Text variant="body-1">Add a link to your content. Enter the URL and optional text for the link.</Text>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Text variant="body-1">URL</Text>
          <TextInput
            id="link-url"
            value={linkUrl}
            onChange={(e) => onLinkUrlChange(e.target.value)}
            placeholder="https://example.com"
          />
        </div>
        <div className="grid gap-2">
          <Text variant="body-1">Text (optional)</Text>
          <TextInput
            id="link-text"
            value={linkText}
            onChange={(e) => onLinkTextChange(e.target.value)}
            placeholder="Link text"
          />
        </div>
      </div>
      <Flex direction="row" justifyContent="flex-end" gap={2} style={{ marginTop: '24px' }}>
        <Button
          view="outlined"
          size="l"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          view="action"
          size="l"
          onClick={onSubmit}
        >
          Add Link
        </Button>
      </Flex>
    </div>
  </Modal>
);
