/**
 * Export the storage interface for the application
 */
import { IStorage } from './storage-interface';
import { storage as supabaseStorage } from './storage-supabase';

// Export the Supabase storage as the main storage implementation
export const storage: IStorage = supabaseStorage;