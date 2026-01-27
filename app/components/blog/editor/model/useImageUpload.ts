import { useCallback, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { useToast } from '@/hooks/use-toast';
import { uploadImage } from '../lib/uploadImage';

type ToastFn = ReturnType<typeof useToast>['toast'];

export const useImageUpload = (editor: Editor | null, toast: ToastFn) => {
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = useCallback(async (file: File) => {
    try {
      if (!editor) return;

      setIsUploading(true);
      const imageSrc = await uploadImage(file);
      console.log('Using image URL:', imageSrc);

      editor.chain().focus().setImage({
        src: imageSrc,
        alt: file.name,
      }).run();

      toast({
        title: 'Success',
        description: 'Image uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [editor, toast]);

  const addImageFromUrl = useCallback(() => {
    try {
      if (!editor) return;

      if (!imageUrl) {
        toast({
          title: 'Error',
          description: 'Please enter an image URL',
          variant: 'destructive',
        });
        return;
      }

      editor.chain().focus().setImage({
        src: imageUrl,
        alt: imageAlt,
      }).run();

      toast({
        title: 'Success',
        description: 'Image added successfully',
      });

      setImageUrl('');
      setImageAlt('');
      setIsImageDialogOpen(false);
    } catch (error) {
      console.error('Error adding image from URL:', error);
      toast({
        title: 'Error',
        description: 'Failed to add image from URL',
        variant: 'destructive',
      });
    }
  }, [editor, imageAlt, imageUrl, toast]);

  return {
    isImageDialogOpen,
    setIsImageDialogOpen,
    imageUrl,
    setImageUrl,
    imageAlt,
    setImageAlt,
    isUploading,
    handleImageUpload,
    addImageFromUrl,
  };
};
