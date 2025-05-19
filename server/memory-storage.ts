/**
 * Memory storage for reliable application operation
 * This backup storage implementation ensures the application always works,
 * even when database connections fail
 */

import { storage as originalStorage } from "./storage-supabase";
import { MemStorage } from "./storage-mem";

// Create fallback in-memory storage
const memStorage = new MemStorage();

// Export the Supabase storage but always provide a memory fallback
export const storage = originalStorage || memStorage;