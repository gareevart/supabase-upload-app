
import { EditorContent, PostData } from "@/app/components/blog/editor/types";

export interface ContentHandlers {
  handleContentChange: (index: number, value: string) => void;
  addContentBlock: (type: EditorContent["type"], index: number) => void;
  moveContentBlock: (index: number, direction: "up" | "down") => void;
  deleteContentBlock: (index: number) => Promise<void>;
  handleBlockTypeChange: (index: number, type: "paragraph" | "heading", level?: 1 | 2) => void;
  handleAltTextChange: (index: number, value: string) => void;
  handleTextGenerated: (generatedText: string, index: number) => void;
}

export interface ImageHandlers {
  handleImageUpload: (index: number, file: File) => Promise<void>;
  handleFeaturedImageUpload: (file: File) => Promise<void>;
  handleDeleteFeaturedImage: () => Promise<void>;
  handleGenerateImage: () => Promise<void>;
  handleApplyGeneratedImage: () => void;
  handleSelectGalleryImage: (imageUrl: string) => void;
}

export interface EditorState {
  title: string;
  slug: string;
  excerpt: string;
  content: EditorContent[];
  featuredImage: File | null;
  featuredImageUrl: string | null;
  isLoading: boolean;
  currentEditingIndex: number;
  imagePrompt: string;
  showGenerationDialog: boolean;
  generatedImagePreview: string | null;
  activeImageTab: string;
}
