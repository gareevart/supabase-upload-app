import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import BlogPostClient from '@/app/blog/[slug]/BlogPostClient'
import { getPublishedPost, getPublishedSlugs } from './getBlogPost'

interface Props {
  params: Promise<{ slug: string }>
}

// Posts are public and near-static: serve pre-rendered HTML and refresh in the
// background once an hour. CRUD routes also call revalidatePath for instant updates.
export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getPublishedSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);

  if (!post) {
    return { title: 'Post Not Found' };
  }

  return {
    title: post.title,
    description: post.excerpt || undefined,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);

  if (!post) {
    notFound();
  }

  return <BlogPostClient post={post} />;
}
