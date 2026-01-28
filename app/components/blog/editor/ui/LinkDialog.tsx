import React from 'react';
import { Button, Dialog, Flex, Text, TextInput } from '@gravity-ui/uikit';
import { DrawerMenu } from '@/shared/ui/DrawerMenu';
import { useIsMobile } from '@/hooks/use-mobile';

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
}: LinkDialogProps) => {
  const isMobile = useIsMobile();
  const dialogTitleId = React.useId();
  const formContent = (
    <Flex direction="column" gap={3}>
      <Text variant="body-1">Add a link to your content. Enter the URL and optional text for the link.</Text>
      <Flex direction="column" gap={4} style={{ padding: '16px 0' }}>
        <Flex direction="column" gap={2}>
          <Text variant="body-1">URL</Text>
          <TextInput
            id="link-url"
            value={linkUrl}
            onChange={(e) => onLinkUrlChange(e.target.value)}
            placeholder="https://example.com"
          />
        </Flex>
        <Flex direction="column" gap={2}>
          <Text variant="body-1">Text (optional)</Text>
          <TextInput
            id="link-text"
            value={linkText}
            onChange={(e) => onLinkTextChange(e.target.value)}
            placeholder="Link text"
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
        Add Link
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <DrawerMenu open={open} onClose={onClose} title="Add Link" footer={footerActions}>
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
      <Dialog.Header caption="Add Link" id={dialogTitleId} />
      <Dialog.Body>{formContent}</Dialog.Body>
      <Dialog.Footer
        onClickButtonCancel={onClose}
        onClickButtonApply={onSubmit}
        textButtonApply="Add Link"
        textButtonCancel="Cancel"
      />
    </Dialog>
  );
};
