import React from 'react';
import { Button, Icon, Modal, Text, TextInput } from '@gravity-ui/uikit';
import { Xmark } from '@gravity-ui/icons';
import { Flex } from '@gravity-ui/uikit';

type ImageResizeDialogProps = {
  open: boolean;
  onClose: () => void;
  width: number;
  height: number;
  onWidthChange: (value: number) => void;
  onHeightChange: (value: number) => void;
  onSubmit: () => void;
};

export const ImageResizeDialog = ({
  open,
  onClose,
  width,
  height,
  onWidthChange,
  onHeightChange,
  onSubmit,
}: ImageResizeDialogProps) => (
  <Modal open={open} onClose={onClose}>
    <div className="modal-content">
      <div className="top-modal">
        <Text variant="subheader-3">Изменить размер изображения</Text>
        <Button size="xl" view="flat" onClick={onClose}>
          <Icon data={Xmark} size={18} />
        </Button>
      </div>

      <Text variant="body-1">Введите новую ширину и высоту для изображения в пикселях. Оставьте поле пустым, чтобы использовать автоматический размер.</Text>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Text variant="body-1">Ширина (px)</Text>
          <TextInput
            type="number"
            value={width.toString()}
            onChange={(e) => {
              const val = e.target.value;
              onWidthChange(val === '' ? 0 : Number(val) || 0);
            }}
            placeholder="автоматически (0 или пустое поле)"
          />
        </div>
        <div className="grid gap-2">
          <Text variant="body-1">Высота (px)</Text>
          <TextInput
            type="number"
            value={height.toString()}
            onChange={(e) => {
              const val = e.target.value;
              onHeightChange(val === '' ? 0 : Number(val) || 0);
            }}
            placeholder="автоматически (0 или пустое поле)"
          />
        </div>
      </div>
      <Flex direction="row" justifyContent="flex-end" gap={2} style={{ marginTop: '24px' }}>
        <Button
          view="outlined"
          size="l"
          onClick={onClose}
        >
          Отмена
        </Button>
        <Button
          view="action"
          size="l"
          onClick={onSubmit}
        >
          Применить
        </Button>
      </Flex>
    </div>
  </Modal>
);
