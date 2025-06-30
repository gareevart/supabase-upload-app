"use client";

import React, { useState } from 'react';
import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { normalizeTipTapContent } from '@/lib/tiptapConverter';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { Button, Icon, TextInput,Text, Modal } from '@gravity-ui/uikit';
import {Bold, Italic, Picture, Xmark} from '@gravity-ui/icons';
import "./editor/editor.css";

// Yandex Cloud Object Storage bucket name
const BUCKET_NAME = 'public-gareevde';
import {
  Underline as UnderlineIcon, AlignLeft, AlignCenter,
  AlignRight, List, ListOrdered, Heading1, Heading2, Image as ImageIcon,
  Link as LinkIcon, Code, Undo, Redo
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
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
  const [open, setOpen] = useState(false);
  
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const { toast } = useToast();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
    ],
    content: normalizeTipTapContent(content),
    onUpdate: ({ editor }) => {
      onChange(JSON.stringify(editor.getJSON()));
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
    },
    // Fix for SSR hydration mismatch
    immediatelyRender: false,
  });

  // Initialize editor with content if it changes
  React.useEffect(() => {
    if (editor && content) {
      try {
        // Only update if content has changed to avoid cursor jumping
        const currentContent = JSON.stringify(editor.getJSON());
        const normalizedContent = normalizeTipTapContent(content);
        
        // Parse the normalized content to get the actual object
        const parsedContent = JSON.parse(normalizedContent);
        
        if (currentContent !== normalizedContent) {
          editor.commands.setContent(parsedContent);
        }
      } catch (e) {
        console.error('Error setting editor content:', e);
      }
    }
  }, [editor, content]);

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

  return (
    <div className="tiptap-editor border rounded-md">
      <div className="toolbar flex flex-wrap gap-1 p-2 border-b">
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
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'is-active' : ''}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        
        <Button
          view="flat"
          size="m"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        
        <Button
          view="flat"
          size="m"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        
        <Button
          view="flat"
          size="m"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'is-active' : ''}
        >
          <List className="h-4 w-4" />
        </Button>
        
        <Button
          view="flat"
          size="m"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
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
          onClick={() => setIsLinkDialogOpen(true)}
        >
          <LinkIcon className="h-4 w-4" />
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
          <ImageIcon className="h-4 w-4" />
          {isUploading && <span className="ml-2">Uploading...</span>}
        </Button>
        
        <Button
          view="flat"
          size="m"
          onClick={() => setOpen(true)}
        >
          <Icon data={Picture} size={16} />
          URL
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
      `}</style>
      
      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <div className="flex bg-white shadow rounded border p-1 gap-1">
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
              onClick={() => setIsLinkDialogOpen(true)}
            >
              <LinkIcon className="h-3 w-3" />
            </Button>
          </div>
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
      
      {/* Image URL Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent aria-describedby="image-dialog-description">
          <DialogHeader>
            <DialogTitle>Add Image from URL</DialogTitle>
          </DialogHeader>
          <p id="image-dialog-description" className="sr-only">
            Add an image to your content. Enter the image URL and alt text for accessibility.
          </p>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Image URL</Label>
              <TextInput
                id="image-url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="grid gap-2">
              <Label>Alt Text</Label>
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
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TipTapEditor;