"use client";

import React, { useState } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { normalizeTipTapContent } from '@/lib/tiptapConverter';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { ImageGenerator } from './extensions/ImageGeneratorExtension';
import { ResizableImage } from './editor/extensions';
import { Button, Icon, TextInput, Text, Modal, Card, DropdownMenu } from '@gravity-ui/uikit';
import {Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, Picture, Xmark, ChevronDown, Heading1, Heading2, Heading3, Heading4, MagicWand, ListUl, Strikethrough} from '@gravity-ui/icons';
import "./editor/editor.css";

// Yandex Cloud Object Storage bucket name
const BUCKET_NAME = 'public-gareevde';
import {
  AlignLeft, AlignCenter,
  AlignRight, List as ListIcon, ListOrdered, Code, Undo, Redo
} from 'lucide-react';
import { DialogFooter } from '@/app/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

const TipTapEditor: React.FC<TipTapEditorProps> = ({
  content,
  onChange,
  placeholder = 'Start writing...'
}) => {
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Resize functionality state
  const [isImageResizeModalOpen, setIsImageResizeModalOpen] = useState(false);
  const [currentImageWidth, setCurrentImageWidth] = useState(0);
  const [currentImageHeight, setCurrentImageHeight] = useState(0);
  const [currentImageId, setCurrentImageId] = useState<string | null>(null);
  
  const { toast } = useToast();

  // Use ref to prevent unnecessary re-renders
  const lastContentString = React.useRef<string>('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded',
        },
      }),
      ResizableImage.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded',
        },
      }),
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      ImageGenerator,
    ],
    content: normalizeTipTapContent(content),
    // Debounced content update to prevent infinite loops
    onUpdate: React.useCallback(({ editor }: { editor: any }) => {
      const newContent = JSON.stringify(editor.getJSON());
      if (newContent !== lastContentString.current) {
        lastContentString.current = newContent;
        onChange(newContent);
      }
    }, [onChange]),
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
    },
    // Fix for SSR hydration mismatch
    immediatelyRender: false,
  });

  // Initialize editor with content if it changes - prevent infinite loops
  const previousNormalizedContent = React.useRef<string>('');

  React.useEffect(() => {
    if (editor && content) {
      try {
        // Normalize the incoming content
        const normalizedContent = normalizeTipTapContent(content);

        // Only update if the normalized content has actually changed
        // This prevents infinite loops where editor.getJSON() !== normalized content
        if (normalizedContent !== previousNormalizedContent.current) {
          previousNormalizedContent.current = normalizedContent;

          // Parse the normalized content to get the actual object
          const parsedContent = JSON.parse(normalizedContent);

          // Set content without triggering onUpdate
          editor.commands.setContent(parsedContent, false);
        }
      } catch (e) {
        console.error('Error setting editor content:', e);
      }
    }
  }, [editor, content]);

  // Отслеживание скролла для изменения стилей панели инструментов
  React.useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setIsScrolled(scrollTop > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  if (!editor) {
    return null;
  }

  const handleImageUpload = async (file: File) => {
    try {
      setIsUploading(true);
      
      // Get the current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        throw new Error('You must be logged in to upload images');
      }
      
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'blog');
      
      // Send the file to your upload API with authentication
      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: {
          'x-user-id': session.user.id
        },
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }
      
      const responseData = await response.json();
      console.log('Image upload response:', responseData);
      
      if (!responseData.data) {
        throw new Error('Invalid response format from upload API');
      }
      
      // Try all available URLs
      const imageUrl = responseData.data.url ||
                       responseData.data.directUrl ||
                       responseData.data.publicUrl ||
                       `https://${BUCKET_NAME}.storage.yandexcloud.net/${responseData.data.path}`;
      
      console.log('Using image URL:', imageUrl);
      
      // Insert the image into the editor
      editor.chain().focus().setImage({
        src: imageUrl,
        alt: file.name
      }).run();
      
      toast({
        title: "Success",
        description: "Image uploaded successfully"
      });
      
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const addImageFromUrl = () => {
    try {
      if (!imageUrl) {
        toast({
          title: "Error",
          description: "Please enter an image URL",
          variant: "destructive"
        });
        return;
      }
      
      editor.chain().focus().setImage({
        src: imageUrl,
        alt: imageAlt
      }).run();
      
      toast({
        title: "Success",
        description: "Image added successfully"
      });
      
      setImageUrl('');
      setImageAlt('');
      setIsImageDialogOpen(false);
    } catch (error) {
      console.error('Error adding image from URL:', error);
      toast({
        title: "Error",
        description: "Failed to add image from URL",
        variant: "destructive"
      });
    }
  };

  const openLinkDialog = () => {
    // Check if cursor is on an existing link
    const { href } = editor.getAttributes('link');
    const selectedText = editor.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to
    );
    
    if (href) {
      // If editing existing link, populate fields
      setLinkUrl(href);
      setLinkText(selectedText || '');
    } else {
      // If creating new link, clear fields but keep selected text
      setLinkUrl('');
      setLinkText(selectedText || '');
    }
    
    setIsLinkDialogOpen(true);
  };

  const addLink = () => {
    try {
      if (!linkUrl) {
        toast({
          title: "Error",
          description: "Please enter a URL",
          variant: "destructive"
        });
        return;
      }
      
      // If text is selected, we want to wrap the selection
      if (editor.state.selection.empty && linkText) {
        // If no text is selected but linkText is provided, insert new text with link
        editor
          .chain()
          .focus()
          .insertContent(`<a href="${linkUrl}">${linkText}</a>`)
          .run();
      } else {
        // Otherwise update the link on the selection
        editor
          .chain()
          .focus()
          .extendMarkRange('link')
          .setLink({ href: linkUrl })
          .run();
      }
      
      toast({
        title: "Success",
        description: "Link added successfully"
      });
      
      setLinkUrl('');
      setLinkText('');
      setIsLinkDialogOpen(false);
    } catch (error) {
      console.error('Error adding link:', error);
      toast({
        title: "Error",
        description: "Failed to add link",
        variant: "destructive"
      });
    }
  };

  const openImageResizeDialog = () => {
    const { from, to } = editor.state.selection;
    const node = editor.state.doc.nodeAt(from);
    if (node && node.type.name === 'resizableImage') {
      const attrs = node.attrs;
      setCurrentImageWidth(attrs.width || 0);
      setCurrentImageHeight(attrs.height || 0);
      setCurrentImageId(attrs.src || null);
      setIsImageResizeModalOpen(true);
    }
  };

  const applyImageResize = () => {
    try {
      // First select the image node properly
      const { from, to } = editor.state.selection;
      if (from !== to) {
        // If selection spans multiple nodes, focus on the image
        const startNode = editor.state.doc.nodeAt(from);
        if (startNode && startNode.type.name === 'resizableImage') {
          editor.commands.setNodeSelection(from);
        }
      }

      // Now update the attributes
      editor
        .chain()
        .focus()
        .updateAttributes('resizableImage', {
          width: currentImageWidth || null,
          height: currentImageHeight || null,
        })
        .run();

      toast({
        title: "Success",
        description: "Image size updated successfully"
      });

      setIsImageResizeModalOpen(false);
      setCurrentImageWidth(0);
      setCurrentImageHeight(0);
      setCurrentImageId(null);
    } catch (error) {
      console.error('Error updating image size:', error);
      toast({
        title: "Error",
        description: "Failed to update image size",
        variant: "destructive"
      });
    }
  };

  const isImageCursorOnElement = () => {
    const { from, to } = editor.state.selection;
    if (from !== to) return false;

    const node = editor.state.doc.nodeAt(from);
    return node?.type.name === 'resizableImage';
  };

  // Get current heading level or return null if not a heading
  const getCurrentHeadingLevel = () => {
    for (let level = 1; level <= 4; level++) {
      if (editor.isActive('heading', { level })) {
        return level;
      }
    }
    return null;
  };

  // Get heading icon based on level
  const getHeadingIcon = (level: number | null) => {
    switch (level) {
      case 1: return <Icon data={Heading1} size={16} />;
      case 2: return <Icon data={Heading2} size={16}/>;
      case 3: return <Icon data={Heading3} size={16} />;
      case 4: return <Icon data={Heading4} size={16} />;
      default: return <Icon data={Heading1} size={16} />;
    }
  };

  // Handle heading selection
  const handleHeadingSelect = (level: number) => {
    editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run();
  };

  const headingMenuItems = [
    {
      iconStart: <Icon size={16} data={Heading1}/>,
      action: () => handleHeadingSelect(1),
      text: 'Heading 1',
    },
    {
      iconStart: <Icon size={16} data={Heading2}/>,
      action: () => handleHeadingSelect(2),
      text: 'Heading 2',
    },
    {
      action: () => handleHeadingSelect(3),
      text: 'Heading 3',
      iconStart: <Icon size={16} data={Heading3}/>,
    },
    {
      action: () => handleHeadingSelect(4),
      text: 'Heading 4',
      iconStart: <Icon size={16} data={Heading4}/>,
    },
  ];

  return (
    <Card>
    <div className="tiptap-editor">
      <div className={`toolbar flex flex-wrap gap-1 p-2 border-b sticky top-0 z-10 shadow-sm ${isScrolled ? 'scrolled' : ''}`}>
        <Button
          view="flat"
          size="m"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
        >
           <Icon data={Bold} size={16} />
        </Button>
        
        <Button
          view="flat"
          size="m"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
        >
           <Icon data={Italic} size={16} />
        </Button>
        
        <Button
          view="flat"
          size="m"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'is-active' : ''}
        >
          <Icon data={Strikethrough} size={16} />
        </Button>
        
        <Button
          view="flat"
          size="m"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'is-active' : ''}
        >
          <Icon data={UnderlineIcon} size={16} />
          
        </Button>
        
        <DropdownMenu
          items={headingMenuItems}
          renderSwitcher={(props) => (
            <Button
              {...props}
              view="flat"
              size="m"
              className={getCurrentHeadingLevel() ? 'is-active' : ''}
            >
              {getHeadingIcon(getCurrentHeadingLevel())}
              <Icon data={ChevronDown} size={16} />
            </Button>
          )}
        />
        
        <Button
          view="flat"
          size="m"
          onClick={() => {
            // Убедимся, что редактор в фокусе и применим стиль списка к текущему блоку
            editor.chain().focus().toggleBulletList().run();
          }}
          className={editor.isActive('bulletList') ? 'is-active' : ''}
        >
          <Icon data={ListUl} size={16} />
        </Button>
        
        <Button
          view="flat"
          size="m"
          onClick={() => {
            // Убедимся, что редактор в фокусе и применим стиль списка к текущему блоку
            editor.chain().focus().toggleOrderedList().run();
          }}
          className={editor.isActive('orderedList') ? 'is-active' : ''}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        
        <Button
          view="flat"
          size="m"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        
        <Button
          view="flat"
          size="m"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        
        <Button
          view="flat"
          size="m"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        
        <Button
          view="flat"
          size="m"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={editor.isActive('codeBlock') ? 'is-active' : ''}
        >
          <Code className="h-4 w-4" />
        </Button>
        
        <Button
          view="flat"
          size="m"
          onClick={openLinkDialog}
          className={editor.isActive('link') ? 'is-active' : ''}
        >
          <Icon data={LinkIcon} size={16} />
        </Button>
        
        <Button
          view="flat"
          size="m"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleImageUpload(file);
            };
            input.click();
          }}
          disabled={isUploading}
        >
          <Icon data={Picture} size={16} />
          {isUploading && <span className="ml-2">Uploading...</span>}
        </Button>
        
        <Button
          view="flat"
          size="m"
          onClick={() => setIsImageDialogOpen(true)}
        >
          <Icon data={Picture} size={16} />
          URL
        </Button>
        
        <Button
          view="flat"
          size="m"
          onClick={() => {
            // Устанавливаем глобальную ссылку на редактор для компонента генератора
            (window as any).currentTipTapEditor = editor;
            editor.chain().focus().insertImageGenerator().run();
          }}
          title="Добавить генератор изображений"
        >
          <Icon data={MagicWand} size={16} />
          AI
        </Button>
        
        <div className="ml-auto flex gap-1">
          <Button
            view="flat"
            size="m"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="h-4 w-4" />
          </Button>
          
          <Button
            view="flat"
            size="m"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <EditorContent
        editor={editor}
        className="p-4 min-h-[300px] prose max-w-none tiptap-editor-content"
      />
      
      {/* Add global styles for the editor content */}
      <style jsx global>{`
        .tiptap-editor-content img {
          max-width: 100%;
          height: auto;
          border-radius: 0.375rem;
          margin: 1rem 0;
          display: block;
        }
        
        .tiptap-editor-content .ProseMirror:focus {
          outline: none;
        }
        
        .tiptap-editor-content .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        
        .tiptap-editor-content .ProseMirror h1 {
          font-size: 2rem;
          font-weight: 700;
          line-height: 1.2;
          margin: 1.5rem 0 1rem 0;
        }
        
        .tiptap-editor-content .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 600;
          line-height: 1.3;
          margin: 1.25rem 0 0.75rem 0;
        }
        
        .tiptap-editor-content .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.4;
          margin: 1rem 0 0.5rem 0;
        }
        
        .tiptap-editor-content .ProseMirror h4 {
          font-size: 1.125rem;
          font-weight: 500;
          line-height: 1.4;
          margin: 0.75rem 0 0.5rem 0;
        }

        /* Resize handles styles */
        .image-resizer-container:hover .resize-handle {
          opacity: 1 !important;
        }

        .resize-handle {
          transition: opacity 0.2s ease;
        }

        .resize-handle:hover {
          background-color: #2563eb !important;
          transform: scale(1.1);
        }

        /* Ensure proper selection behavior for images */
        .tiptap-editor-content .ProseMirror-selected.resizable-image {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }
      `}</style>
      
      {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 100 }}
          shouldShow={({ state, from, to }) => {
            const node = state.doc.nodeAt(from);
            return node?.type.name === 'resizableImage';
          }}
        >
          <Card>
          <div className="flex shadow BubbleMenu p-1 gap-1">
            <Button
              view="flat"
              size="s"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={editor.isActive('bold') ? 'is-active' : ''}
            >
              <Bold className="h-3 w-3" />
            </Button>
            
            <Button
              view="flat"
              size="s"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={editor.isActive('strike') ? 'is-active' : ''}
            >
              <Strikethrough className="h-3 w-3" />
            </Button>
            
            <Button
              view="flat"
              size="s"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={editor.isActive('italic') ? 'is-active' : ''}
            >
              <Italic className="h-3 w-3" />
            </Button>
            
            <Button
              view="flat"
              size="s"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={editor.isActive('underline') ? 'is-active' : ''}
            >
              <UnderlineIcon className="h-3 w-3" />
            </Button>
            
            <Button
              view="flat"
              size="s"
              onClick={openLinkDialog}
              className={editor.isActive('link') ? 'is-active' : ''}
            >
              <LinkIcon className="h-3 w-3" />
            </Button>

            <Button
              view="flat"
              size="s"
              onClick={openImageResizeDialog}
              className={isImageCursorOnElement() ? 'is-active' : ''}
              disabled={!isImageCursorOnElement()}
              title="Изменить размер"
            >
              <Icon data={Picture} size={14} />
            </Button>
          </div>
           </Card>
        </BubbleMenu>
      )}
      
      {/* Link Dialog */}
      <Modal open={isLinkDialogOpen} onClose={() => setIsLinkDialogOpen(false)}>
        <div className='modal-content'>
        <div className='top-modal'>
          <Text variant="subheader-3">Add Link</Text>
          <Button size='xl' view='flat' onClick={() => setIsLinkDialogOpen(false)}>
          <Icon data={Xmark} size={18} /></Button>
        </div>
        
        <Text variant="body-1">Add a link to your content. Enter the URL and optional text for the link.</Text>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Text variant="body-1">URL</Text>
              <TextInput
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="grid gap-2">
              <Text variant="body-1">Text (optional)</Text>
              <TextInput
                id="link-text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Link text"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              view="outlined"
              size="l"
              onClick={() => setIsLinkDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              view="action"
              size="l"
              onClick={addLink}
            >
              Add Link
            </Button>
          </DialogFooter>
          </div>
      </Modal>
      
      {/* Image URL Modal */}
      <Modal open={isImageDialogOpen} onClose={() => setIsImageDialogOpen(false)}>
        <div className='modal-content'>
        <div className='top-modal'>
          <Text variant="subheader-3">Add Image from URL</Text>
          <Button size='xl' view='flat' onClick={() => setIsImageDialogOpen(false)}>
          <Icon data={Xmark} size={18} /></Button>
        </div>
        
        <Text variant="body-1">Add an image to your content. Enter the image URL and alt text for accessibility.</Text>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Text variant="body-1">Image URL</Text>
              <TextInput
                id="image-url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="grid gap-2">
              <Text variant="body-1">Alt Text</Text>
              <TextInput
                id="image-alt"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                placeholder="Image description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              view="outlined"
              size="l"
              onClick={() => setIsImageDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              view="action"
              size="l"
              onClick={addImageFromUrl}
            >
              Add Image
            </Button>
          </DialogFooter>
          </div>
      </Modal>

      {/* Image Resize Modal */}
      <Modal open={isImageResizeModalOpen} onClose={() => setIsImageResizeModalOpen(false)}>
        <div className='modal-content'>
        <div className='top-modal'>
          <Text variant="subheader-3">Изменить размер изображения</Text>
          <Button size='xl' view='flat' onClick={() => setIsImageResizeModalOpen(false)}>
          <Icon data={Xmark} size={18} /></Button>
        </div>

        <Text variant="body-1">Введите новую ширину и высоту для изображения в пикселях. Оставьте поле пустым, чтобы использовать автоматический размер.</Text>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Text variant="body-1">Ширина (px)</Text>
              <TextInput
                type="number"
                value={currentImageWidth.toString()}
                onChange={(e) => {
                  const val = e.target.value;
                  setCurrentImageWidth(val === '' ? 0 : Number(val) || 0);
                }}
                placeholder="автоматически (0 или пустое поле)"
              />
            </div>
            <div className="grid gap-2">
              <Text variant="body-1">Высота (px)</Text>
              <TextInput
                type="number"
                value={currentImageHeight.toString()}
                onChange={(e) => {
                  const val = e.target.value;
                  setCurrentImageHeight(val === '' ? 0 : Number(val) || 0);
                }}
                placeholder="автоматически (0 или пустое поле)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              view="outlined"
              size="l"
              onClick={() => setIsImageResizeModalOpen(false)}
            >
              Отмена
            </Button>
            <Button
              view="action"
              size="l"
              onClick={applyImageResize}
            >
              Применить
            </Button>
          </DialogFooter>
          </div>
      </Modal>
    </div>
    </Card>
  );
};

export default TipTapEditor;
