"use client"

import { Text, Icon, Flex, Link } from '@gravity-ui/uikit';
import FileUpload from '@/app/components/bucket/FileUpload';
import FileView from '@/app/components/bucket/FileView';
import '../../auth/Auth.css';

export default function Uploader() {
  return (
      <div className="page-container">
        <div className="content-container">
        <Text variant="header-1">Image Syncer</Text>
        <FileUpload />
        <FileView />
      </div>
      </div>
  );
}
