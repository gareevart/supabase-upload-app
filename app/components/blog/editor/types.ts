
export type EditorContent = {
  type: "paragraph" | "heading" | "image";
  content: string;
  level?: 1 | 2 | 3;
  url?: string;
  alt?: string;
};

export type PostData = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: EditorContent[];
  featured_image: string | null;
  author_id?: string;
  published?: boolean;
  created_at?: string;
  updated_at?: string;
};
