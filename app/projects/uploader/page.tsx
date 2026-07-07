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
    <div className="uploader-page">
      <main className="uploader-page__main">
        <div className="uploader-page__content">
          <CustomBreadcrumbs segmentLabels={segmentLabels} />
          <Text variant="header-1">{t('gallery.title')}</Text>
          <FileUpload />
          <FileView />
        </div>
      </main>
    </div>
  );
}
