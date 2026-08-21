import { supabase } from '@/lib/supabase';

export const uploadImage = async (file: File): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('You must be logged in to upload images');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'blog');

  const response = await fetch('/api/storage/upload', {
    method: 'POST',
    headers: { 'x-user-id': session.user.id },
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error ?? 'Failed to upload image');
  }

  const responseData = await response.json();
  if (!responseData.data) throw new Error('Invalid response format from upload API');

  const imageUrl = responseData.data.url ?? responseData.data.publicUrl;

  if (!imageUrl) throw new Error('Upload response missing image URL');
  return imageUrl;
};
