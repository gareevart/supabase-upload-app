import { useState, useRef, useCallback } from "react";
import { Button, Icon, Text, Progress } from '@gravity-ui/uikit';
import { Xmark, Paperclip, File as FileIcon } from '@gravity-ui/icons';
import { uploadFile } from "@/lib/yandexStorage";
import { useAuth } from "@/app/contexts/AuthContext";
import "./FileUploader.css";

export interface FileAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface FileUploaderProps {
  onFilesChange: (files: FileAttachment[]) => void;
  files?: FileAttachment[]; // Current files from parent
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedTypes?: string[];
  disabled?: boolean;
  compact?: boolean; // Show only button without file list
}

export const FileUploader = ({
  onFilesChange,
  files = [],
  maxFiles = 5,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  acceptedTypes = ['image/*', 'application/pdf', '.doc', '.docx', '.txt'],
  disabled = false,
  compact = false
}: FileUploaderProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `Файл "${file.name}" слишком большой. Максимальный размер: ${formatFileSize(maxFileSize)}`;
    }

    // Check if we can add more files
    if (files.length >= maxFiles) {
      return `Можно прикрепить максимум ${maxFiles} файлов`;
    }

    return null;
  }, [maxFileSize, maxFiles, files.length]);

  const handleFileSelect = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    setError(null);
    setUploading(true);

    const newFiles: FileAttachment[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];

      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }

      try {
        // Update progress
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        // Upload to Yandex Storage with user ID for authorization
        const result = await uploadFile(file, 'chat-attachments', user?.id);

        if (result.error) {
          throw result.error;
        }

        // Get public URL (preferring directUrl for better performance)
        const publicUrl = result.data.directUrl || result.data.publicUrl || result.data.url;

        const attachment: FileAttachment = {
          name: file.name,
          url: publicUrl,
          type: file.type,
          size: file.size
        };

        newFiles.push(attachment);

        // Update progress to 100%
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
      } catch (err) {
        console.error('Error uploading file:', err);
        setError(`Ошибка загрузки файла "${file.name}"`);
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
      }
    }

    const updatedFiles = [...files, ...newFiles];
    onFilesChange(updatedFiles);
    setUploading(false);

    // Clear progress after upload
    setTimeout(() => {
      setUploadProgress({});
    }, 1000);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [files, onFilesChange, user?.id, validateFile]);

  const handleRemoveFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    onFilesChange(updatedFiles);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled || uploading) return;

    const droppedFiles = e.dataTransfer.files;
    handleFileSelect(droppedFiles);
  }, [disabled, uploading, handleFileSelect]);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return '🖼️';
    } else if (type.includes('pdf')) {
      return '📄';
    } else if (type.includes('word') || type.includes('document')) {
      return '📝';
    } else if (type.includes('excel') || type.includes('sheet')) {
      return '📊';
    }
    return '📎';
  };

  // In compact mode, only show the button
  if (compact) {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="file-uploader__input"
          disabled={disabled || uploading}
        />
        <Button
          view="outlined"
          size="m"
          onClick={handleButtonClick}
          disabled={disabled || uploading || files.length >= maxFiles}
          title="Прикрепить файл"
          className="file-uploader__compact-button"
        >
          <Icon data={Paperclip} size={16} />
        </Button>
      </>
    );
  }

  // Full mode with file list
  return (
    <div className="file-uploader">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="file-uploader__input"
        disabled={disabled || uploading}
      />

      {files.length > 0 && (
        <div className="file-uploader__list">
          {files.map((file, index) => (
            <div key={index} className="file-uploader__item">
              <div className="file-uploader__item-icon">
                {getFileIcon(file.type)}
              </div>
              <div className="file-uploader__item-info">
                <Text variant="body-2" className="file-uploader__item-name">
                  {file.name}
                </Text>
                <Text variant="caption-2" color="secondary">
                  {formatFileSize(file.size)}
                </Text>
              </div>
              <Button
                view="flat"
                size="xs"
                onClick={() => handleRemoveFile(index)}
                disabled={disabled || uploading}
                className="file-uploader__item-remove"
              >
                <Icon data={Xmark} size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {Object.keys(uploadProgress).length > 0 && (
        <div className="file-uploader__progress">
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} className="file-uploader__progress-item">
              <Text variant="caption-2">{fileName}</Text>
              <Progress value={progress} size="s" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="file-uploader__error">
          <Text variant="caption-2" color="danger">
            {error}
          </Text>
        </div>
      )}
    </div>
  );
};

