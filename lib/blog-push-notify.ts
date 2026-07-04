import { isCnsConfigured, publishBlogPushNotification } from '@/lib/yandex-cns';

type BlogPostNotificationInput = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
};

function getSiteOrigin(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (appUrl) {
    return appUrl;
  }

  const vercelUrl = process.env.VERCEL_URL?.replace(/\/$/, '');
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  return 'http://localhost:3000';
}

export async function notifyBlogPostPublished(post: BlogPostNotificationInput): Promise<void> {
  if (!isCnsConfigured()) {
    console.info('[blog-push] Yandex CNS is not configured, skipping push notification');
    return;
  }

  if (!process.env.YANDEX_CNS_TOPIC_ARN?.trim()) {
    console.info('[blog-push] YANDEX_CNS_TOPIC_ARN is not set, skipping push notification');
    return;
  }

  const origin = getSiteOrigin();
  const url = `${origin}/blog/${post.slug}`;

  try {
    await publishBlogPushNotification({
      title: 'New blog post',
      body: post.excerpt?.trim() || post.title,
      url,
    });
    console.info('[blog-push] Published push notification for blog post', { id: post.id, slug: post.slug });
  } catch (err) {
    console.error('[blog-push] Failed to publish push notification:', err);
  }
}
