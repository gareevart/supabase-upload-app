'use client';

import { useState } from 'react';
import { Button, Text, useToaster } from '@gravity-ui/uikit';
import { supabase } from '@/lib/supabase';

interface FileUploaderProps {
  bucketName: string;
  folderPath: string;
  onUploadComplete: (url: string) => void;
  existingFileUrl: string;
  acceptedFileTypes: string;
  maxSizeMB: number;
  allowDelete: boolean;
  onDeleteComplete?: () => void; // Optional callback for when a file is deleted
}

const FileUploader = ({
  bucketName,
  folderPath,
  onUploadComplete,
  existingFileUrl,
  acceptedFileTypes,
  maxSizeMB,
  allowDelete,
  onDeleteComplete
}: FileUploaderProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(existingFileUrl || null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      // Check file type
      if (acceptedFileTypes && !selectedFile.type.match(acceptedFileTypes)) {
        setError(`Please select a valid file type (${acceptedFileTypes})`);
        setFile(null);
        return;
      }
      
      // Check file size
      if (maxSizeMB && selectedFile.size > maxSizeMB * 1024 * 1024) {
        setError(`File size must be less than ${maxSizeMB}MB`);
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
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;

      // Upload file to Storage
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL for the file
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      onUploadComplete(publicUrl);
    } catch (error: any) {
      if (error.message && error.message.includes('row-level security policy')) {
        setError(`Access error: You need to configure RLS policies for the "${bucketName}" bucket in Supabase.`);
      } else {
        setError(error.message || 'An error occurred while uploading the file');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingFileUrl || !allowDelete) return;
    
    try {
      setUploading(true);
      
      // Extract file path from URL
      const urlParts = existingFileUrl.split(`${bucketName}/`);
      if (urlParts.length < 2) throw new Error('Invalid file URL');
      
      const filePath = urlParts[1];
      
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);
      
      if (error) throw error;
      
      setPreview(null);
      onUploadComplete(''); // Update the parent component with empty URL
      
      // Call the onDeleteComplete callback if provided
      if (onDeleteComplete) {
        onDeleteComplete();
      }

      // Show a success toast for file deletion
      const toaster = useToaster();
      toaster.add({
        name: 'delete-file-success',
        title: 'Успех',
        content: 'Файл удален',
        theme: 'danger',
        autoHiding: 5000,
      });
    } catch (error: any) {
      setError(error.message || 'An error occurred while deleting the file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {preview && preview.startsWith('http') && (
        <div style={{ marginBottom: '12px' }}>
          <img 
            src={preview} 
            alt="Preview" 
            style={{ 
              maxWidth: '80px', 
              maxHeight: '80px', 
              borderRadius: '6px',
              objectFit: 'cover'
            }} 
          />
          {allowDelete && (
            <Button 
              size="m" 
              view="outlined-danger" 
              onClick={handleDelete}
              loading={uploading}
              style={{ marginLeft: '8px' }}
            >
              Delete
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
          Upload
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

export default FileUploader;
