import type { Metadata } from "next";

interface PostSEOData {
  title: string;
  excerpt?: string;
  featuredImageUrl: string | null;
  postUrl: string;
}

export function generatePostMetadata({
  title,
  excerpt,
  featuredImageUrl,
  postUrl,
}: PostSEOData): Metadata {
  const pageTitle = `${title} | Gareev Dmitrii Blog`;
  
  return {
    title: pageTitle,
    description: excerpt,
    openGraph: {
      title: title,
      description: excerpt,
      url: postUrl,
      siteName: "Visual Scribe",
      type: "article",
      images: featuredImageUrl ? [
        {
          url: featuredImageUrl,
          alt: title,
        }
      ] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: title,
      description: excerpt,
      images: featuredImageUrl ? [featuredImageUrl] : undefined,
    },
  };
}
