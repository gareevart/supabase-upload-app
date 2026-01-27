import React from 'react';
import { Button, Icon, Modal, Text, TextInput } from '@gravity-ui/uikit';
import { Xmark } from '@gravity-ui/icons';
import { Flex } from '@gravity-ui/uikit';

type ImageUrlDialogProps = {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  onImageUrlChange: (value: string) => void;
  imageAlt: string;
  onImageAltChange: (value: string) => void;
  onSubmit: () => void;
};

export const ImageUrlDialog = ({
  open,
  onClose,
  imageUrl,
  onImageUrlChange,
  imageAlt,
  onImageAltChange,
  onSubmit,
}: ImageUrlDialogProps) => (
  <Modal open={open} onClose={onClose}>
    <div className="modal-content">
      <div className="top-modal">
        <Text variant="subheader-3">Add Image from URL</Text>
        <Button size="xl" view="flat" onClick={onClose}>
          <Icon data={Xmark} size={18} />
        </Button>
      </div>

      <Text variant="body-1">Add an image to your content. Enter the image URL and alt text for accessibility.</Text>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Text variant="body-1">Image URL</Text>
          <TextInput
            id="image-url"
            value={imageUrl}
            onChange={(e) => onImageUrlChange(e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
        </div>
        <div className="grid gap-2">
          <Text variant="body-1">Alt Text</Text>
          <TextInput
            id="image-alt"
            value={imageAlt}
            onChange={(e) => onImageAltChange(e.target.value)}
            placeholder="Image description"
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
          Add Image
        </Button>
      </Flex>
    </div>
  </Modal>
);
