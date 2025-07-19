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
      <div className="page-container">
        <div className="content-container">
        <CustomBreadcrumbs segmentLabels={segmentLabels} />
        <Text variant="header-1">Image Syncer</Text>
        <FileUpload />
        <FileView />
      </div>
      </div>
  );
}
