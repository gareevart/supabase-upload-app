// Interface for file objects
export interface FileObject {
  name: string;
  id?: string;
  metadata?: { size?: number };
  created_at?: string;
}

const FOLDER_PREFIX = 'profiles/';

// Upload file using the API route
export async function uploadFile(file: File, customPath?: string, userId?: string) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    if (customPath) {
      formData.append('folder', customPath);
    }

    const headers: HeadersInit = {};
    const isPublicUpload = customPath?.includes('public') || (!userId && !customPath);
    
    // Для публичных загрузок не передаем userId
    if (!isPublicUpload && userId) {
      headers['x-user-id'] = userId;
    }

    const response = await fetch('/api/storage/upload', {
      headers,
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Error uploading file');
    }

    return {
      data: result.data,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error occurred during upload'),
    };
  }
}

// List files using the API route
export async function listFiles(prefix: string = FOLDER_PREFIX, bucket: string = 'buckets3', userId?: string) {
  try {
    const headers: HeadersInit = {};
    if (userId) {
      headers['x-user-id'] = userId;
    }

    const url = `/api/storage/list?prefix=${encodeURIComponent(prefix)}&bucket=${bucket}`;

    const response = await fetch(url, { headers });
    const result = await response.json();

    if (!response.ok) {
      let errorMsg = 'Error listing files';
      if (result?.error) {
        errorMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
      }
      throw new Error(`${errorMsg} (Status: ${response.status})`);
    }

    return {
      data: result.data,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error occurred while listing files'),
    };
  }
}

// Delete file using the API route
export async function deleteFile(filePath: string, userId?: string) {
  try {
    const headers: HeadersInit = {};
    if (userId) {
      headers['x-user-id'] = userId;
    }
    const response = await fetch(`/api/storage/delete?path=${encodeURIComponent(filePath)}`, {
      headers,
      method: 'DELETE',
    });
    
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Error deleting file');
    }

    return {
      data: result.data,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error occurred while deleting file'),
    };
  }
}

// Get public URL for a file using the API route
export async function getPublicUrl(filePath: string) {
  try {
    const response = await fetch(`/api/storage/url?path=${encodeURIComponent(filePath)}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Error generating URL');
    }

    return result.url;
  } catch (error) {
    throw error;
  }
}
