import "../blog.css"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card"
import { ArrowLeft, Calendar, Person } from "@gravity-ui/icons"
import Link from "next/link"
import { generatePostMetadata } from "@/app/components/blog/components/PostSEO"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

interface BlogPost {
  id: string
  title: string
  content: string | { html?: string } | any
  excerpt: string | null
  slug: string | null
  featured_image: string | null
  created_at: string | null
  updated_at: string | null
  published: boolean | null
  author_id: string
  author: {
    name: string | null
    username: string | null
    avatar_url: string | null
  }
}

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

async function getPost(slug: string): Promise<BlogPost | null> {
  try {
    // First fetch the blog post
    const { data, error } = await supabase
      .from("blog_posts")
      .select(`
        id,
        title,
        content,
        excerpt,
        slug,
        featured_image,
        created_at,
        updated_at,
        published,
        author_id
      `)
      .eq("slug", slug)
      .eq("published", true)
      .single();

    if (error || !data) {
      return null;
    }

    // Then fetch the author information
    const { data: authorData } = await supabase
      .from("profiles")
      .select("id, name, username, avatar_url")
      .eq("id", data.author_id)
      .single();

    return {
      ...data,
      author: authorData || {
        name: null,
        username: null,
        avatar_url: null
      }
    };
  } catch (error) {
    console.error("Error fetching blog post:", error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  
  if (!post) {
    return {
      title: "Post Not Found | Visual Scribe"
    };
  }

  const postUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/blog/${post.slug}`;
  
  return generatePostMetadata({
    title: post.title,
    excerpt: post.excerpt || undefined,
    featuredImageUrl: post.featured_image,
    postUrl
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  return (
    <div className="container max-w-4xl mx-auto mt-6">
          <CardTitle className="text-3xl font-bold mb-4">{post.title}</CardTitle>
          <div className="flex flex-wrap items-center gap-4 mb-4 mb-6text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{post.created_at ? formatDate(post.created_at) : 'Дата не указана'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Person className="w-4 h-4" />
              <span>{post.author?.name || post.author?.username || "Anonymous"}</span>
            </div>
          </div>

        {post.featured_image && (
          <div className="w-full h-[300px] md:h-[400px] overflow-hidden">
            <img
              src={post.featured_image}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <CardContent className="prose prose-lg max-w-none pt-6">
          <div className="tiptap-content">
            {typeof post.content === 'string'
              ? <div dangerouslySetInnerHTML={{ __html: post.content }} />
              : typeof post.content === 'object' && post.content?.html
                ? <div dangerouslySetInnerHTML={{ __html: post.content.html }} />
                : <pre>{JSON.stringify(post.content, null, 2)}</pre>
            }
          </div>
        </CardContent>
    </div>
  );
}
