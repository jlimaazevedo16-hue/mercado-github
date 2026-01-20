import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UploadResult {
  url: string;
  path: string;
}

export const useDocumentUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadDocument = async (
    file: File, 
    folder: string
  ): Promise<UploadResult | null> => {
    setUploading(true);
    setProgress(0);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const fileName = `${folder}/${timestamp}-${randomStr}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(data.path);

      setProgress(100);
      
      return {
        url: urlData.publicUrl,
        path: data.path,
      };
    } catch (error) {
      console.error('Error uploading document:', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (path: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from('documents')
        .remove([path]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  };

  return {
    uploadDocument,
    deleteDocument,
    uploading,
    progress,
  };
};
