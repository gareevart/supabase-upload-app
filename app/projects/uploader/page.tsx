"use client"

import { useEffect, useState } from "react";
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
  const [sharedImagePath, setSharedImagePath] = useState<string | null>();
  const segmentLabels = {
    projects: t('gallery.breadcrumb.projects'),
    uploader: t('gallery.breadcrumb.gallery'),
  };

  useEffect(() => {
    setSharedImagePath(new URLSearchParams(window.location.search).get('image'));
  }, []);

  useEffect(() => {
    if (sharedImagePath === null && !isAuthLoading && !user) {
      sessionStorage.setItem('returnUrl', '/projects/uploader');
      router.push('/auth');
    }
  }, [isAuthLoading, sharedImagePath, user, router]);

  if (sharedImagePath === undefined || (!sharedImagePath && (isAuthLoading || !user))) {
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
          {!sharedImagePath && <FileUpload />}
          <FileView sharedImagePath={sharedImagePath} />
        </div>
      </main>
    </div>
  );
}
