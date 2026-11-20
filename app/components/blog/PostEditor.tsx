"use client";

import { useRouter } from "next/navigation";
import { Button, DropdownMenu } from '@gravity-ui/uikit';
import { PageActionBar } from '@/shared/ui/PageActionBar';
import { useBlogEditorContent } from "@/features/blog-editor/model/useBlogEditorContent";
import { useI18n } from "@/app/contexts/I18nContext";
import PostMetadata from "./editor/PostMetadata";
import { MarkdownEditor } from "@/features/blog-editor/ui/MarkdownEditor";
import "./BlogEditor.css";

type PostEditorProps = {
  initialPost?: any;
  onSave?: (published: boolean, post: any) => void;
};

const PostEditor = ({ initialPost, onSave }: PostEditorProps) => {
  const { t } = useI18n();
  const router = useRouter();
  const {
    title, setTitle,
    slug, setSlug,
    excerpt, setExcerpt,
    markdownContent,
    featuredImageUrl,
    showFeaturedImage, setShowFeaturedImage,
    isLoading,
    showGalleryDialog, setShowGalleryDialog,
    isUploading,
    handleContentChange,
    handleFeaturedImageUpload,
    handleDeleteFeaturedImage,
    handleSelectGalleryImage,
    savePost
  } = useBlogEditorContent(initialPost, onSave);

  const handleSaveDraft = () => {
    void savePost(false);
  };

  const handlePublish = () => {
    void savePost(true);
  };

  const handleCancel = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/blog');
    }
  };

  return (
    <div className="post-editor">
      <PageActionBar
        ariaLabel={t('blogEditor.postActions')}
        items={[{ label: t(initialPost ? 'blogEditor.editPost' : 'blogEditor.createPost') }]}
        actions={
          <>
            <Button type="button" view="action" loading={isLoading} onClick={handlePublish}>
              {t('blogEditor.publish')}
            </Button>
            <DropdownMenu
              disabled={isLoading}
              defaultSwitcherProps={{
                'aria-label': t('blogEditor.moreActions'),
              }}
              items={[
                {
                  text: t('blogEditor.saveDraft'),
                  action: handleSaveDraft,
                },
                {
                  text: t('blogEditor.cancel'),
                  action: handleCancel,
                },
              ]}
            />
          </>
        }
      />

      <div className="post-editor__content">
        <PostMetadata
          title={title}
          setTitle={setTitle}
          slug={slug}
          setSlug={setSlug}
          excerpt={excerpt}
          setExcerpt={setExcerpt}
          featuredImageUrl={featuredImageUrl}
          showFeaturedImage={showFeaturedImage}
          setShowFeaturedImage={setShowFeaturedImage}
          onDeleteFeaturedImage={handleDeleteFeaturedImage}
          onUploadFeaturedImage={handleFeaturedImageUpload}
          onSelectGalleryImage={handleSelectGalleryImage}
          isUploading={isUploading}
          showGalleryDialog={showGalleryDialog}
          setShowGalleryDialog={setShowGalleryDialog}
        />
        <MarkdownEditor
          content={markdownContent}
          onChange={handleContentChange}
          placeholder={t('blogEditor.contentPlaceholder')}
        />
      </div>
    </div>
  );
};

export default PostEditor;
