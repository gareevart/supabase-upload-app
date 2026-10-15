"use client"

import { useEffect } from "react";
import { Text } from "@gravity-ui/uikit";
import { useAuth } from "@/app/contexts/AuthContext";
import { useI18n } from "@/app/contexts/I18nContext";
import { useRouter } from "next/navigation";
import FileUpload from "@/app/components/bucket/FileUpload";
import FileView from "@/app/components/bucket/FileView";
import CustomBreadcrumbs from "../../components/Breadcrumbs/Breadcrumbs";
import { GalleryPageSkeleton } from "./GalleryPageSkeleton";
import "../../auth/Auth.css";
import "./page.css";

export default function Uploader() {
  const { user, loading: isAuthLoading } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const segmentLabels = {
    projects: t('gallery.breadcrumb.projects'),
    uploader: t('gallery.breadcrumb.gallery'),
  };

  useEffect(() => {
    if (!isAuthLoading && !user) {
      sessionStorage.setItem('returnUrl', '/projects/uploader');
      router.push('/auth');
    }
  }, [isAuthLoading, user, router]);

  if (isAuthLoading || !user) {
    return <GalleryPageSkeleton />;
  }

  return (
    <div className="hub-page uploader-page">
      <main className="hub-page__main uploader-page__main">
        <div className="uploader-page__content">
          <CustomBreadcrumbs segmentLabels={segmentLabels} />
          <header className="hub-page__header uploader-page__header">
            <Text as="h1" variant="display-1">{t('gallery.title')}</Text>
          </header>
          <FileUpload />
          <FileView />
        </div>
      </main>
    </div>
  );
}
