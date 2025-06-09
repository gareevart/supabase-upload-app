
import { useState, useEffect } from "react";
import { PostData } from "@/app/components/blog/editor/types";
import { transliterate } from "@/lib/transliterate";

export function usePostMetadata(initialPost?: PostData) {
  const [title, setTitle] = useState(initialPost?.title || "");
  const [slug, setSlug] = useState(initialPost?.slug || "");
  const [excerpt, setExcerpt] = useState(initialPost?.excerpt || "");
  const [isLoading, setIsLoading] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Generate slug from title if not manually set
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      // Check if title contains Cyrillic characters
      const hasCyrillic = /[а-яА-ЯёЁ]/.test(title);
      
      // If title has Cyrillic characters, transliterate them
      const processedTitle = hasCyrillic ? transliterate(title) : title.toLowerCase();
      
      // Generate slug by replacing non-alphanumeric characters with hyphens and removing consecutive hyphens
      const generatedSlug = processedTitle
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
        
      setSlug(generatedSlug);
    }
  }, [title, slugManuallyEdited]);

  // Update slug with user input and mark as manually edited
  const handleSlugChange = (newSlug: string) => {
    setSlugManuallyEdited(true);
    setSlug(newSlug.replace(/\s+/g, '-').toLowerCase());
  };

  return {
    title, setTitle,
    slug, setSlug: handleSlugChange,
    excerpt, setExcerpt,
    isLoading, setIsLoading,
    slugManuallyEdited, setSlugManuallyEdited
  };
}
