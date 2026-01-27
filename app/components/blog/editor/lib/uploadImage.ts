import { supabase } from '@/lib/supabase';

// Yandex Cloud Object Storage bucket name
const BUCKET_NAME = 'public-gareevde';

export const uploadImage = async (file: File): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error('You must be logged in to upload images');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'blog');

  const response = await fetch('/api/storage/upload', {
    method: 'POST',
    headers: {
      'x-user-id': session.user.id,
    },
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to upload image');
  }

  const responseData = await response.json();
  if (!responseData.data) {
    throw new Error('Invalid response format from upload API');
  }

  const imageUrl = responseData.data.url ||
    responseData.data.directUrl ||
    responseData.data.publicUrl ||
    `https://${BUCKET_NAME}.storage.yandexcloud.net/${responseData.data.path}`;

  if (!imageUrl) {
    throw new Error('Upload response missing image URL');
  }

  return imageUrl;
};
