import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export const uploadFileToSupabase = async (file: File, path: string): Promise<string> => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      if (error.message.includes('JWT')) {
        throw new Error('Authentication error - invalid JWT token');
      }
      if (error.message.includes('CORS')) {
        throw new Error('CORS error - check Supabase storage bucket CORS settings');
      }
      throw error;
    }

    const { data: publicUrl } = supabase.storage
      .from('uploads')
      .getPublicUrl(path);

    return publicUrl.publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}; 