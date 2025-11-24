"use client"

import { Text, Icon, Flex, Link } from '@gravity-ui/uikit';
import FileUpload from '@/app/components/bucket/FileUpload';
import FileView from '@/app/components/bucket/FileView';
import CustomBreadcrumbs from '../../components/Breadcrumbs/Breadcrumbs';
import '../../auth/Auth.css';

export default function Uploader() {
  const segmentLabels = {
    'projects': 'Projects',
    'uploader': 'Image Syncer'
  };

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
