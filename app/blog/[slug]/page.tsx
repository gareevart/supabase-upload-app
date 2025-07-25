import { supabase } from "@/lib/supabase"
import type { Metadata } from 'next'
import BlogPostClient from '@/app/blog/[slug]/BlogPostClient'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  
  try {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("title, excerpt")
      .eq("slug", slug)
      .eq("published", true)
      .single();

    if (error || !data) {
      return {
        title: 'Post Not Found',
      };
    }

    return {
      title: data.title,
      description: data.excerpt || undefined,
    };
  } catch (error) {
    return {
      title: 'Post Not Found',
    };
  }
}

export default function BlogPostPage({ params }: Props) {
  return <BlogPostClient params={params} />;
}
