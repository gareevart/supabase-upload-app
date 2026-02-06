import { Card, Icon, Button, Text } from '@gravity-ui/uikit';
import { Calendar, Pencil, TrashBin } from '@gravity-ui/icons';
import Link from "next/link";
import Image from "next/image";

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
  readButtonText = "Read",
  onReadClick,
  isDraft = false,
  onEdit,
  onDelete,
  isDeleting = false
}: BlogPostCardProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const handleReadClick = () => {
    if (onReadClick) {
      onReadClick(post);
    } else {
      window.location.href = `/blog/${post.slug}`;
    }
  };

  // Grid View - вертикальная карточка (изображение сверху)
  if (gridView) {
    return (
      <Card size="l" className="w-full min-w-[280px] overflow-hidden">
        <div className="p-2">
          {post.featured_image ? (
            <div className="h-48 w-full overflow-hidden rounded-lg">
              {isDraft ? (
                <div style={{ position: 'relative', display: 'block', height: '100%', width: '100%' }}>
                  <Image
                    src={post.featured_image}
                    alt={post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-all duration-300"
                    priority={isPriority}
                    loading={isPriority ? undefined : "lazy"}
                  />
                </div>
              ) : (
                <Link
                  href={`/blog/${post.slug}`}
                  style={{ position: 'relative', display: 'block', height: '100%', width: '100%' }}
                >
                  <Image
                    src={post.featured_image}
                    alt={post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-all duration-300 hover:scale-105"
                    priority={isPriority}
                    loading={isPriority ? undefined : "lazy"}
                  />
                </Link>
              )}
            </div>
          ) : (
            <div className="h-48 w-full bg-emerald-700 dark:bg-black-800 rounded-lg"></div>
          )}
        </div>
        
        <div className="p-4">
          <div className="mb-2">
            {isDraft ? (
              <Text ellipsis={true} whiteSpace="break-spaces" ellipsisLines={2} variant="header-1">
                {post.title}
              </Text>
            ) : (
              <Link href={post.slug ? `/blog/${post.slug}` : `/blog/edit/${post.id}`}>
                <Text ellipsis={true} whiteSpace="break-spaces" ellipsisLines={2} variant="header-1">
                  {post.title}
                </Text>
              </Link>
            )}
            {post.searchContext ? (
              <Text className="mt-2" color="secondary">
                <span
                  dangerouslySetInnerHTML={{
                    __html: post.searchContext.highlightedContext
                  }}
                />
              </Text>
            ) : (
              post.excerpt && <Text className="mt-2" color="secondary">{post.excerpt}</Text>
            )}
          </div>

          <div className="flex justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Icon data={Calendar} size={16} />
                <Text variant="body-2">
                  {post.created_at ? formatDate(post.created_at) : 'Without date'}
                </Text>
              </div>
            </div>
            {isDraft ? (
              <div className="flex items-center gap-2">
                <Button
                  view="outlined"
                  size="m"
                  className="flex items-center gap-1"
                  onClick={() => onEdit?.(post.id)}
                >
                  <Icon data={Pencil} size={16} />
                  <span>Edit</span>
                </Button>
                <Button
                  view="outlined-danger"
                  size="m"
                  onClick={() => onDelete?.(post.id)}
                  loading={isDeleting}
                  disabled={isDeleting}
                  title="Delete draft"
                >
                  <Icon data={TrashBin} size={16} />
                </Button>
              </div>
            ) : showReadButton && (
              <Button
                view="normal"
                size="m"
                onClick={handleReadClick}
              >
                {readButtonText}
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // List View - горизонтальная карточка (изображение слева)
  return (
    <Card size="l" className="w-full overflow-hidden">
      <div className="flex flex-row">
        {/* Изображение слева - 30% ширины */}
        <div className="w-[30%] min-w-[200px] flex-shrink-0">
          {post.featured_image ? (
            <div className="h-full w-full overflow-hidden">
              {isDraft ? (
                <div style={{ position: 'relative', display: 'block', height: '100%', width: '100%', minHeight: '200px' }}>
                  <Image
                    src={post.featured_image}
                    alt={post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 30vw"
                    className="object-cover transition-all duration-300"
                    priority={isPriority}
                    loading={isPriority ? undefined : "lazy"}
                  />
                </div>
              ) : (
                <Link
                  href={`/blog/${post.slug}`}
                  style={{ position: 'relative', display: 'block', height: '100%', width: '100%', minHeight: '200px' }}
                >
                  <Image
                    src={post.featured_image}
                    alt={post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 30vw"
                    className="object-cover transition-all duration-300 hover:scale-105"
                    priority={isPriority}
                    loading={isPriority ? undefined : "lazy"}
                  />
                </Link>
              )}
            </div>
          ) : (
            <div className="h-full w-full bg-emerald-700 dark:bg-black-800 min-h-[200px]"></div>
          )}
        </div>

        {/* Контент справа - 70% ширины */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div className="mb-3">
            {isDraft ? (
              <Text ellipsis={true} whiteSpace="break-spaces" ellipsisLines={2} variant="header-1">
                {post.title}
              </Text>
            ) : (
              <Link href={post.slug ? `/blog/${post.slug}` : `/blog/edit/${post.id}`}>
                <Text ellipsis={true} whiteSpace="break-spaces" ellipsisLines={2} variant="header-1" className="hover:opacity-80 transition-opacity">
                  {post.title}
                </Text>
              </Link>
            )}
            {post.searchContext ? (
              <Text className="mt-2" color="secondary">
                <span
                  dangerouslySetInnerHTML={{
                    __html: post.searchContext.highlightedContext
                  }}
                />
              </Text>
            ) : (
              post.excerpt && (
                <Text className="mt-2" color="secondary" ellipsis={true} ellipsisLines={3}>
                  {post.excerpt}
                </Text>
              )
            )}
          </div>

          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Icon data={Calendar} size={16} />
              <Text variant="body-2">
                {post.created_at ? formatDate(post.created_at) : 'Without date'}
              </Text>
            </div>
            {isDraft ? (
              <div className="flex items-center gap-2">
                <Button
                  view="outlined"
                  size="m"
                  className="flex items-center gap-1"
                  onClick={() => onEdit?.(post.id)}
                >
                  <Icon data={Pencil} size={16} />
                  <span>Edit</span>
                </Button>
                <Button
                  view="outlined-danger"
                  size="m"
                  onClick={() => onDelete?.(post.id)}
                  loading={isDeleting}
                  disabled={isDeleting}
                  title="Delete draft"
                >
                  <Icon data={TrashBin} size={16} />
                </Button>
              </div>
            ) : showReadButton && (
              <Button
                view="normal"
                size="m"
                onClick={handleReadClick}
              >
                {readButtonText}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default BlogPostCard;

