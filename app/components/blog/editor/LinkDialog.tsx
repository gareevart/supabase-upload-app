
import React, { useState } from 'react';
import {Button} from '@gravity-ui/uikit';
import { Input } from "@/app/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";

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
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Добавить ссылку</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-sm" htmlFor="linkText">
              Текст
            </label>
            <Input
              id="linkText"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-sm" htmlFor="linkUrl">
              URL
            </label>
            <Input
              id="linkUrl"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="col-span-3"
              placeholder="https://"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Отмена
          </Button>
          <Button onClick={handleAddLink}>Добавить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LinkDialog;
