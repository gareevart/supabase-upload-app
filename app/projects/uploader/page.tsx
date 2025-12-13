"use client"

import { Text, Icon, Flex, Link, Spin } from '@gravity-ui/uikit';
import { useAuth } from "@/app/contexts/AuthContext";
import { redirect } from "next/navigation";
import FileUpload from '@/app/components/bucket/FileUpload';
import FileView from '@/app/components/bucket/FileView';
import CustomBreadcrumbs from '../../components/Breadcrumbs/Breadcrumbs';
import '../../auth/Auth.css';

export default function Uploader() {
  const { user, loading: isAuthLoading } = useAuth();
  const segmentLabels = {
    'projects': 'Projects',
    'uploader': 'Image Syncer'
  };

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Spin size="m" />
          <div className="mt-4">Loading...</div>
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
    <div className="min-h-screen">
      <main className="container mx-auto px-4 md:px-6 max-w-4xl">
        <div className="flex flex-col gap-6">
          <CustomBreadcrumbs segmentLabels={segmentLabels} />
          <Text variant="header-1">Image Syncer</Text>
          <FileUpload />
          <FileView />
        </div>
      </main>
    </div>
  );
}
