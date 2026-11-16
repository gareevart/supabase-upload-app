"use client";

import { useRouter } from "next/navigation";
import { Breadcrumbs, Button, DropdownMenu } from '@gravity-ui/uikit';
import { ActionBar } from '@gravity-ui/navigation';
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
      <div className="post-editor__actionbar">
        <ActionBar aria-label={t('blogEditor.postActions')}>
          <ActionBar.Section className="post-editor__actionbar-section">
            <ActionBar.Group className="post-editor__breadcrumb-group" stretchContainer>
              <ActionBar.Item className="post-editor__breadcrumb-item">
                <Breadcrumbs>
                  <Breadcrumbs.Item>
                    {t(initialPost ? 'blogEditor.editPost' : 'blogEditor.createPost')}
                  </Breadcrumbs.Item>
                </Breadcrumbs>
              </ActionBar.Item>
            </ActionBar.Group>

            <ActionBar.Group className="post-editor__action-group" pull="right">
              <ActionBar.Item>
                <Button
                  type="button"
                  size="l"
                  view="action"
                  loading={isLoading}
                  onClick={handlePublish}
                >
                  {t('blogEditor.publish')}
                </Button>
              </ActionBar.Item>
              <ActionBar.Item>
                <DropdownMenu
                  size="l"
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
              </ActionBar.Item>
            </ActionBar.Group>
          </ActionBar.Section>
        </ActionBar>
      </div>

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
