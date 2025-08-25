'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button, Text, useToaster } from '@gravity-ui/uikit';
import { useAuth } from '@/app/contexts/AuthContext';

interface YandexFileUploaderProps {
  folderPath: string;
  onUploadComplete: (url: string) => void;
  existingFileUrl: string;
  acceptedFileTypes: string;
  maxSizeMB: number;
  allowDelete: boolean;
  onDeleteComplete?: () => void;
}

const YandexFileUploader = ({
  folderPath,
  onUploadComplete,
  existingFileUrl,
  acceptedFileTypes,
  maxSizeMB,
  allowDelete,
  onDeleteComplete
}: YandexFileUploaderProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(existingFileUrl || null);
  const { user } = useAuth();
  const { add } = useToaster();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      // Check file type
      if (acceptedFileTypes && !selectedFile.type.match(acceptedFileTypes)) {
        setError(`Пожалуйста, выберите правильный тип файла (${acceptedFileTypes})`);
        setFile(null);
        return;
      }
      
      // Check file size
      if (maxSizeMB && selectedFile.size > maxSizeMB * 1024 * 1024) {
        setError(`Размер файла должен быть меньше ${maxSizeMB}MB`);
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError(null);
      
      // Create a preview for images
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !user) {
      setError('Пожалуйста, выберите файл для загрузки');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folderPath);

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: {
          'x-user-id': user.id,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка при загрузке файла');
      }

      const uploadedUrl = result.data.directUrl || result.data.publicUrl || result.data.url;
      setPreview(uploadedUrl);
      onUploadComplete(uploadedUrl);

      add({
        name: 'upload-success',
        title: 'Успех',
        content: 'Файл успешно загружен',
        theme: 'success',
        autoHiding: 5000,
      });

      // Clear the file input
      setFile(null);
    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.message || 'Произошла ошибка при загрузке файла');
      
      add({
        name: 'upload-error',
        title: 'Ошибка',
        content: error.message || 'Произошла ошибка при загрузке файла',
        theme: 'danger',
        autoHiding: 5000,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingFileUrl || !allowDelete || !user) return;
    
    try {
      setUploading(true);
      setError(null);
      
      // Extract file path from URL
      // URL format: https://public-gareevde.storage.yandexcloud.net/profiles/userId/filename.ext
      // or: https://storage.yandexcloud.net/public-gareevde/profiles/userId/filename.ext
      let filePath = '';
      
      if (existingFileUrl.includes('storage.yandexcloud.net/public-gareevde/')) {
        // Format: https://storage.yandexcloud.net/public-gareevde/profiles/userId/filename.ext
        const parts = existingFileUrl.split('storage.yandexcloud.net/public-gareevde/');
        if (parts.length > 1) {
          filePath = parts[1].split('?')[0]; // Remove query parameters
        }
      } else if (existingFileUrl.includes('public-gareevde.storage.yandexcloud.net/')) {
        // Format: https://public-gareevde.storage.yandexcloud.net/profiles/userId/filename.ext
        const parts = existingFileUrl.split('public-gareevde.storage.yandexcloud.net/');
        if (parts.length > 1) {
          filePath = parts[1].split('?')[0]; // Remove query parameters
        }
      }
      
      if (!filePath) {
        throw new Error('Не удалось извлечь путь к файлу из URL');
      }

      console.log('Deleting file with path:', filePath);

      const response = await fetch(`/api/storage/delete?path=${encodeURIComponent(filePath)}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.id,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка при удалении файла');
      }
      
      setPreview(null);
      onUploadComplete(''); // Update the parent component with empty URL
      
      // Call the onDeleteComplete callback if provided
      if (onDeleteComplete) {
        onDeleteComplete();
      }

      add({
        name: 'delete-file-success',
        title: 'Успех',
        content: 'Файл удален',
        theme: 'success',
        autoHiding: 5000,
      });
    } catch (error: any) {
      console.error('Delete error:', error);
      setError(error.message || 'Произошла ошибка при удалении файла');
      
      add({
        name: 'delete-file-error',
        title: 'Ошибка',
        content: error.message || 'Произошла ошибка при удалении файла',
        theme: 'danger',
        autoHiding: 5000,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {preview && preview.startsWith('http') && (
        <div className='flex pb-4 items-center'>
          <div style={{ position: 'relative', width: '80px', height: '80px' }}>
            <Image
              src={preview}
              alt="Preview"
              fill
              className="profile-avatar"
              style={{ objectFit: 'cover' }}
              sizes="80px"
            />
          </div>
          {allowDelete && (
            <Button
              size="m"
              view="outlined-danger" 
              onClick={handleDelete}
              loading={uploading}
              style={{ marginLeft: '8px' }}
            >
              Удалить
            </Button>
          )}
        </div>
      )}
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="file"
          accept={acceptedFileTypes}
          onChange={handleFileChange}
          disabled={uploading}
          style={{ 
            flex: '1',
            padding: '8px',
            border: '1px solid var(--g-color-line-generic, rgba(255, 255, 255, 0.15))',
            borderRadius: '8px'
          }}
        />
        
        <Button
          size="l"
          view="action"
          onClick={handleUpload}
          loading={uploading}
          disabled={!file}
        >
          Загрузить
        </Button>
      </div>
      
      {error && (
        <Text color="danger" variant="body-2" style={{ marginTop: '8px' }}>
          {error}
        </Text>
      )}
    </div>
  );
};

export default YandexFileUploader;
