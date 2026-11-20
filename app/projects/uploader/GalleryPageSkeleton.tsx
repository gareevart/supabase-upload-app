'use client';

import { Card, Skeleton } from '@gravity-ui/uikit';
import { PageActionBar } from '@/shared/ui/PageActionBar';
import { useI18n } from '@/app/contexts/I18nContext';
import '../../components/components.css';
import './page.css';

const GRID_SKELETON_COUNT = 8;

export function GalleryPageSkeleton() {
  const { t } = useI18n();

  return (
    <div className="uploader-page">
      <PageActionBar
        ariaLabel={t('gallery.pageActions')}
        breadcrumbs={<Skeleton className="page-action-bar__skeleton" />}
      />
      <main className="hub-page__main uploader-page__main">
        <div className="uploader-page__content">
          <Skeleton className="uploader-page__skeleton-title" />

          <Card view="filled" className="responsive-card uploader-page__skeleton-upload">
            <Skeleton className="uploader-page__skeleton-upload-label" />
            <Skeleton className="uploader-page__skeleton-upload-field" />
            <Skeleton className="uploader-page__skeleton-upload-button" />
          </Card>

          <Card type="container" className="responsive-card">
            <div className="file-view-header">
              <Skeleton className="uploader-page__skeleton-section-title" />
              <Skeleton className="uploader-page__skeleton-refresh-button" />
            </div>
            <div className="file-view-grid">
              {Array.from({ length: GRID_SKELETON_COUNT }, (_, index) => (
                <div key={`skeleton-${index}`} className="file-view-item">
                  <div className="file-view-image-container">
                    <Skeleton className="file-view-skeleton" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
