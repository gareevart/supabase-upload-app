"use client";

import { Card, Icon, Button, Text } from '@gravity-ui/uikit';
import { Calendar, Pencil, TrashBin } from '@gravity-ui/icons';
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useI18n } from "@/app/contexts/I18nContext";
import "./BlogPostCard.css";

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string | null;
  slug: string | null;
  featured_image: string | null;
  created_at: string | null;
  author_id: string;
  author?: {
    name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  searchContext?: {
    context: string;
    highlightedContext: string;
  } | null;
}

interface BlogPostCardProps {
  post: BlogPost;
  gridView?: boolean;
  isPriority?: boolean;
  showReadButton?: boolean;
  readButtonText?: string;
  onReadClick?: (post: BlogPost) => void;
  isDraft?: boolean;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  isDeleting?: boolean;
}

export const BlogPostCard = ({
  post,
  gridView = false,
  isPriority = false,
  showReadButton = true,
  readButtonText,
  onReadClick,
  isDraft = false,
  onEdit,
  onDelete,
  isDeleting = false
}: BlogPostCardProps) => {
  const { t, language } = useI18n();
  const router = useRouter();
  const readLabel = readButtonText || t('blogCard.read');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'ru' ? "ru-RU" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const handleReadClick = () => {
    if (onReadClick) {
      onReadClick(post);
    } else if (post.slug) {
      router.push(`/blog/${post.slug}`);
    }
  };

  const imageSizes = gridView
    ? "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    : "(max-width: 768px) 100vw, 30vw";

  const renderImage = () => {
    if (!post.featured_image) {
      return <div className="blog-card__placeholder" />;
    }

    const image = (
      <Image
        src={post.featured_image}
        alt={post.title}
        fill
        sizes={imageSizes}
        className="blog-card__img"
        priority={isPriority}
        loading={isPriority ? undefined : "lazy"}
      />
    );

    // Drafts have no public page yet, so the image isn't a link.
    if (isDraft) {
      return <div className="blog-card__image">{image}</div>;
    }

    return (
      <Link href={`/blog/${post.slug}`} className="blog-card__image">
        {image}
      </Link>
    );
  };

  const renderTitle = () => {
    const title = (
      <Text ellipsis={true} whiteSpace="break-spaces" ellipsisLines={2} variant="header-1">
        {post.title}
      </Text>
    );

    if (isDraft) {
      return title;
    }

    return (
      <Link
        href={post.slug ? `/blog/${post.slug}` : `/blog/edit/${post.id}`}
        className="blog-card__title-link"
      >
        {title}
      </Link>
    );
  };

  const renderExcerpt = () => {
    if (post.searchContext) {
      return (
        <Text className="blog-card__excerpt" color="secondary">
          <span dangerouslySetInnerHTML={{ __html: post.searchContext.highlightedContext }} />
        </Text>
      );
    }

    if (post.excerpt) {
      return (
        <Text
          className="blog-card__excerpt"
          color="secondary"
          ellipsis={!gridView}
          ellipsisLines={gridView ? undefined : 3}
        >
          {post.excerpt}
        </Text>
      );
    }

    return null;
  };

  const renderMeta = () => (
    <div className="blog-card__meta">
      <div className="blog-card__date">
        <Icon data={Calendar} size={16} />
        <Text variant="body-2" color="secondary">
          {post.created_at ? formatDate(post.created_at) : t('blogCard.noDate')}
        </Text>
      </div>
      {isDraft ? (
        <div className="blog-card__actions">
          <Button view="outlined" size="m" onClick={() => onEdit?.(post.id)}>
            <Icon data={Pencil} size={16} />
            {t('blogCard.edit')}
          </Button>
          <Button
            view="outlined-danger"
            size="m"
            onClick={() => onDelete?.(post.id)}
            loading={isDeleting}
            disabled={isDeleting}
            title={t('blogCard.deleteDraft')}
          >
            <Icon data={TrashBin} size={16} />
          </Button>
        </div>
      ) : showReadButton && (
        <Button view="normal" size="m" onClick={handleReadClick}>
          {readLabel}
        </Button>
      )}
    </div>
  );

  // Grid view — vertical card (image on top)
  if (gridView) {
    return (
      <Card size="l" className="blog-card">
        <div className="blog-card__media">{renderImage()}</div>
        <div className="blog-card__body">
          <div className="blog-card__header">
            {renderTitle()}
            {renderExcerpt()}
          </div>
          {renderMeta()}
        </div>
      </Card>
    );
  }

  // List view — horizontal card (image on the left)
  return (
    <Card size="l" className="blog-card">
      <div className="blog-card__row">
        <div className="blog-card__media-left">{renderImage()}</div>
        <div className="blog-card__content">
          <div className="blog-card__header">
            {renderTitle()}
            {renderExcerpt()}
          </div>
          {renderMeta()}
        </div>
      </div>
    </Card>
  );
};

export default BlogPostCard;
