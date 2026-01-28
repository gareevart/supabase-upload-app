import React from 'react';
import { Button, Dialog, Flex, Text, TextInput } from '@gravity-ui/uikit';
import { DrawerMenu } from '@/shared/ui/DrawerMenu';
import { useIsMobile } from '@/hooks/use-mobile';

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
}: ImageUrlDialogProps) => {
  const isMobile = useIsMobile();
  const dialogTitleId = React.useId();
  const formContent = (
    <Flex direction="column" gap={3}>
      <Text variant="body-1">
        Add an image to your content. Enter the image URL and alt text for accessibility.
      </Text>
      <Flex direction="column" gap={4} style={{ padding: '16px 0' }}>
        <Flex direction="column" gap={2}>
          <Text variant="body-1">Image URL</Text>
          <TextInput
            id="image-url"
            value={imageUrl}
            onChange={(e) => onImageUrlChange(e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
        </Flex>
        <Flex direction="column" gap={2}>
          <Text variant="body-1">Alt Text</Text>
          <TextInput
            id="image-alt"
            value={imageAlt}
            onChange={(e) => onImageAltChange(e.target.value)}
            placeholder="Image description"
          />
        </Flex>
      </Flex>
    </Flex>
  );
  const footerActions = (
    <>
      <Button view="outlined" size="l" onClick={onClose}>
        Cancel
      </Button>
      <Button view="action" size="l" onClick={onSubmit}>
        Add Image
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <DrawerMenu
        open={open}
        onClose={onClose}
        title="Add Image from URL"
        footer={footerActions}
      >
        {formContent}
      </DrawerMenu>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="s"
      aria-labelledby={dialogTitleId}
      className="editor-dialog"
    >
      <Dialog.Header caption="Add Image from URL" id={dialogTitleId} />
      <Dialog.Body>{formContent}</Dialog.Body>
      <Dialog.Footer
        onClickButtonCancel={onClose}
        onClickButtonApply={onSubmit}
        textButtonApply="Add Image"
        textButtonCancel="Cancel"
      />
    </Dialog>
  );
};
