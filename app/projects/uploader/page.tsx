"use client"

import { Text, Spin } from "@gravity-ui/uikit";
import { useAuth } from "@/app/contexts/AuthContext";
import { redirect } from "next/navigation";
import FileUpload from "@/app/components/bucket/FileUpload";
import FileView from "@/app/components/bucket/FileView";
import CustomBreadcrumbs from "../../components/Breadcrumbs/Breadcrumbs";
import "../../auth/Auth.css";
import "./page.css";

export default function Uploader() {
  const { user, loading: isAuthLoading } = useAuth();
  const segmentLabels = {
    projects: "Projects",
    uploader: "Image Syncer",
  };

  if (isAuthLoading) {
    return (
      <div className="uploader-page__loading">
        <div className="uploader-page__loading-content">
          <Spin size="m" />
          <div className="uploader-page__loading-text">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    // Сохраняем текущий путь для возврата после авторизации
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('returnUrl', '/projects/uploader');
    }
    redirect("/auth");
    return null;
  }

  return (
    <div className="uploader-page">
      <main className="uploader-page__main">
        <div className="uploader-page__content">
          <CustomBreadcrumbs segmentLabels={segmentLabels} />
          <Text variant="header-1">Image Syncer</Text>
          <FileUpload />
          <FileView />
        </div>
      </main>
    </div>
  );
}
