
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type FileType = 'image' | 'video' | 'document';

export const getFileType = (file: File): FileType => {
  const type = file.type.split('/')[0];
  if (type === 'image') return 'image';
  if (type === 'video') return 'video';
  return 'document';
};

export const uploadFile = async (
  file: File, 
  bucketName: string, 
  folderPath: string
): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${folderPath}/${fileName}`;

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file);

    if (error) throw error;

    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    toast.error('Failed to upload file');
    return null;
  }
};
