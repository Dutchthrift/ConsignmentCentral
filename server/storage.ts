/**
 * Export the storage interface for the application
 */
import { IStorage } from './storage-interface';
import { MemStorage } from './storage-mem';

// Export the memory storage as the main storage implementation
export const storage: IStorage = new MemStorage();